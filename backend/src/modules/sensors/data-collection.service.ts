import { Injectable, Logger, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TemperatureReading } from './entities/temperature-reading.entity';
import { TemperatureAnalysis } from './entities/temperature-analysis.entity';
import { Device } from '../devices/entities/device.entity';
import { Config, ConfigDocument } from '../config/entities/config.entity';
import { SmartNodeCommonService } from '../smartnode-common.service';
import { StartDataCollectionDto } from './dto/start-data-collection.dto';
import { StopDataCollectionDto } from './dto/stop-data-collection.dto';
import { Unit } from '../../shared/enums';
import { Client, TransferTransaction, PrivateKey, Hbar, AccountId } from '@hashgraph/sdk';

interface DataCollectionSession {
  deviceId: string;
  privateKey: string;
  isActive: boolean;
  batchCount: number;   
  readings: any[];
  startTime: string;
  lastReading: string;
}

@Injectable()
export class DataCollectionService implements OnModuleInit {
  private readonly logger = new Logger(DataCollectionService.name);
  private activeSessions = new Map<string, DataCollectionSession>();
  private readonly BATCH_SIZE = 10;
  private readonly READING_INTERVAL_MS = 10000; // 10 seconds
  
  constructor(
    @InjectModel(TemperatureReading.name)
    private readonly temperatureReadingModel: Model<TemperatureReading>,
    @InjectModel(TemperatureAnalysis.name)
    private readonly temperatureAnalysisModel: Model<TemperatureAnalysis>,
    @InjectModel(Device.name)
    private readonly deviceModel: Model<Device>,
    @InjectModel(Config.name)
    private readonly configModel: Model<ConfigDocument>,
    private readonly smartNodeCommonService: SmartNodeCommonService,
  ) {}

  /**
   * Initialize the service and start data collection for active devices
   */
  async onModuleInit() {
    this.logger.log('DataCollectionService initialized');
    
    // Wait a bit for all dependencies to be ready
    setTimeout(async () => {
      await this.startDataCollectionForActiveDevices();
    }, 2000);
  }

  /**
   * Automatically start data collection for all active devices
   */
  async startDataCollectionForActiveDevices() {
    try {
      this.logger.log('Checking for active devices to start data collection...');
      
      const activeDevices = await this.deviceModel.find({ 
        isActive: true,
        privateKey: { $exists: true, $ne: null },
        hcsTopic: { $exists: true, $ne: null }
      }).exec();

      this.logger.log(`Found ${activeDevices.length} active devices`);

      for (const device of activeDevices) {
        if (!this.activeSessions.has(device.deviceId)) {
          await this.startDataCollectionInternal(device.deviceId, device.privateKey);
        }
      }
    } catch (error) {
      this.logger.error('Error starting data collection for active devices:', error);
    }
  }

  /**
   * Internal method to start data collection without external validation
   */
  private async startDataCollectionInternal(deviceId: string, privateKey: string) {
    try {
      const session: DataCollectionSession = {
        deviceId,
        privateKey,
        isActive: true,
        batchCount: 0,
        readings: [],
        startTime: new Date().toISOString(),
        lastReading: new Date().toISOString()
      };

      this.activeSessions.set(deviceId, session);
      this.logger.log(`🌡️ Data collection started automatically for device: ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to start data collection for device ${deviceId}:`, error);
    }
  }

  /**
   * Start data collection for a device
   */
  async startDataCollection(dto: StartDataCollectionDto): Promise<{ status: string; message: string }> {
    this.logger.log(`Starting data collection for device: ${dto.deviceId}`);

    // Validate device exists and has necessary configuration
    const device = await this.deviceModel.findOne({ deviceId: dto.deviceId }).exec();
    if (!device) {
      throw new NotFoundException(`Device ${dto.deviceId} not found`);
    }

    if (!device.hcsTopic) {
      throw new BadRequestException(`Device ${dto.deviceId} does not have an HCS topic configured`);
    }

    // Validate private key matches device
    if (device.privateKey !== dto.privateKey) {
      throw new BadRequestException('Invalid private key for device');
    }

    // Check if session already exists
    if (this.activeSessions.has(dto.deviceId)) {
      throw new BadRequestException(`Data collection already active for device ${dto.deviceId}`);
    }

    // Create new session
    const session: DataCollectionSession = {
      deviceId: dto.deviceId,
      privateKey: dto.privateKey,
      isActive: true,
      batchCount: 0,
      readings: [],
      startTime: new Date().toISOString(),
      lastReading: new Date().toISOString()
    };

    this.activeSessions.set(dto.deviceId, session);

    this.logger.log(`Data collection started for device: ${dto.deviceId}`);
    return {
      status: 'success',
      message: `Data collection started for device ${dto.deviceId}`
    };
  }

  /**
   * Stop data collection for a device
   */
  async stopDataCollection(dto: StopDataCollectionDto): Promise<{ status: string; message: string }> {
    this.logger.log(`Stopping data collection for device: ${dto.deviceId}`);

    // Validate device exists
    const device = await this.deviceModel.findOne({ deviceId: dto.deviceId }).exec();
    if (!device) {
      throw new NotFoundException(`Device ${dto.deviceId} not found`);
    }

    // Validate private key matches device
    if (device.privateKey !== dto.privateKey) {
      throw new BadRequestException('Invalid private key for device');
    }

    // Check if session exists
    const session = this.activeSessions.get(dto.deviceId);
    if (!session) {
      throw new BadRequestException(`No active data collection session for device ${dto.deviceId}`);
    }

    // Process any remaining readings in the batch
    if (session.readings.length > 0) {
      await this.processReadingsBatch(session);
    }

    // Remove session
    this.activeSessions.delete(dto.deviceId);

    this.logger.log(`Data collection stopped for device: ${dto.deviceId}`);
    return {
      status: 'success',
      message: `Data collection stopped for device ${dto.deviceId}`
    };
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Get session status for a device
   */
  getSessionStatus(deviceId: string): any {
    const session = this.activeSessions.get(deviceId);
    if (!session) {
      return { active: false };
    }

    return {
      active: true,
      deviceId: session.deviceId,
      batchCount: session.batchCount,
      currentReadings: session.readings.length,
      startTime: session.startTime,
      lastReading: session.lastReading
    };
  }

  /**
   * Cron job to collect data every 10 seconds
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async collectDataFromActiveSessions() {
    if (this.activeSessions.size === 0) {
      return; // No active sessions, skip
    }

    this.logger.debug(`📊 Collecting data from ${this.activeSessions.size} active sessions`);
    
    for (const [deviceId, session] of this.activeSessions) {
      if (session.isActive) {
        await this.collectSingleReading(session);
      }
    }
  }

  /**
   * Simulate collecting a single temperature reading
   */
  private async collectSingleReading(session: DataCollectionSession) {
    try {
      // Simulate temperature reading (in a real scenario, this would come from actual sensors)
      const temperature = this.generateMockTemperature();
      
      const reading = {
        deviceId: session.deviceId,
        value: temperature,
        unit: Unit.CELCIUS,
        timestamp: new Date().toISOString(),
        location: await this.getDeviceLocation(session.deviceId)
      };

      // Add to batch
      session.readings.push(reading);
      session.lastReading = new Date().toISOString();

      this.logger.log(`🌡️ Reading ${session.readings.length}/${this.BATCH_SIZE} for device ${session.deviceId}: ${temperature}°C`);

      // Save individual reading to database
      await this.temperatureReadingModel.create(reading);

      // Check if batch is complete
      if (session.readings.length >= this.BATCH_SIZE) {
        this.logger.log(`🔄 Batch complete! Processing ${this.BATCH_SIZE} readings for device ${session.deviceId}`);
        await this.processReadingsBatch(session);
        session.readings = [];
        session.batchCount++;
      }
    } catch (error) {
      this.logger.error(`Error collecting reading for device ${session.deviceId}:`, error);
    }
  }

  /**
   * Process a batch of readings with AI analysis
   */
  private async processReadingsBatch(session: DataCollectionSession) {
    try {
      this.logger.log(`Processing batch for device ${session.deviceId} with ${session.readings.length} readings`);

      // Create AI analysis
      const analysis = await this.createAIAnalysis(session.deviceId, session.readings);

      // Get device information
      const device = await this.deviceModel.findOne({ deviceId: session.deviceId }).exec();
      if (!device || !device.hcsTopic) {
        throw new Error(`Device ${session.deviceId} not found or missing HCS topic`);
      }

      // Submit to topic
      await this.submitAnalysisToTopic(device.hcsTopic, analysis);

      // Send rewards
      await this.sendRewardTokens(device);

      this.logger.log(`✅ Successfully processed batch ${session.batchCount} for device ${session.deviceId}`);
    } catch (error) {
      this.logger.error(`Error processing batch for device ${session.deviceId}:`, error);
    }
  }

  /**
   * Create AI analysis that matches device.topics.validator.json structure
   */
  private async createAIAnalysis(deviceId: string, readings: any[]): Promise<any> {
    const batchId = `batch_${deviceId}_${Date.now()}`;
    const startTime = readings[0]?.timestamp || new Date().toISOString();
    const endTime = readings[readings.length - 1]?.timestamp || new Date().toISOString();

    // Calculate statistics
    const temperatures = readings.map(r => r.value);
    const averageTemperature = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
    const minimumTemperature = Math.min(...temperatures);
    const maximumTemperature = Math.max(...temperatures);

    // Calculate standard deviation
    const variance = temperatures.reduce((acc, temp) => acc + Math.pow(temp - averageTemperature, 2), 0) / temperatures.length;
    const standardDeviation = Math.sqrt(variance);

    // Identify outliers (readings more than 2 standard deviations from mean)
    const outliers = readings
      .map(reading => ({
        value: reading.value,
        timestamp: reading.timestamp,
        deviation: Math.abs(reading.value - averageTemperature) / standardDeviation
      }))
      .filter(item => item.deviation > 2);

    // Simple trend analysis
    const trendSlope = temperatures.length > 1 
      ? (temperatures[temperatures.length - 1] - temperatures[0]) / (temperatures.length - 1)
      : 0;

    // Predictions (simple simulation)
    const predictions = [{
      predictedValue: averageTemperature + trendSlope,
      confidence: 0.85,
      anomalyScore: outliers.length / readings.length,
      isAnomaly: outliers.length > readings.length * 0.2,
      trend: trendSlope > 0.1 ? 'rising' : trendSlope < -0.1 ? 'falling' : 'stable'
    }];

    // Determine severity
    let severity = 'normal';
    if (outliers.length > readings.length * 0.5) severity = 'critical';
    else if (outliers.length > readings.length * 0.3) severity = 'high';
    else if (outliers.length > readings.length * 0.2) severity = 'medium';
    else if (outliers.length > readings.length * 0.1) severity = 'low';

    // Generate warnings
    const warnings = [];
    if (maximumTemperature > 35) warnings.push('High temperature detected');
    if (minimumTemperature < 0) warnings.push('Freezing temperature detected');
    if (outliers.length > 0) warnings.push(`${outliers.length} outlier readings detected`);

    // Create analysis object that matches device.topics.validator.json
    const analysis = {
      deviceId,
      batchId,
      readingCount: readings.length,
      timeRange: {
        start: new Date(startTime).toISOString(),
        end: new Date(endTime).toISOString()
      },
      averageTemperature,
      unit: Unit.CELCIUS,
      minimumTemperature,
      maximumTemperature,
      outliers,
      predictions,
      severity,
      warnings,
      aiInsights: `Analysis of ${readings.length} temperature readings. Average: ${averageTemperature.toFixed(2)}°C, Range: ${minimumTemperature.toFixed(2)}°C to ${maximumTemperature.toFixed(2)}°C. Trend: ${predictions[0].trend}. ${outliers.length} outliers detected.`,
      location: {
        latitude: 0,
        longitude: 0
      },
      chainTxHash: '',
      analysisTimestamp: new Date().toISOString(),
      statisticalData: {
        standardDeviation,
        variance,
        trendSlope,
        stabilityScore: Math.max(0, 1 - (standardDeviation / averageTemperature)),
        mlConfidenceScore: 0.85,
        modelTrained: true
      }
    };

    // Save analysis to database
    await this.temperatureAnalysisModel.create({
      ...analysis,
      timeRange: {
        start: analysis.timeRange.start,
        end: analysis.timeRange.end
      },
      analysisTimestamp: analysis.analysisTimestamp
    });

    return analysis;
  }

  /**
   * Submit analysis to device topic
   */
  private async submitAnalysisToTopic(topicId: string, analysis: TemperatureAnalysis): Promise<void> {
    try {
        console.log('submitAnalysisToTopic', topicId, analysis);
      const result = await this.smartNodeCommonService.submitMessageToTopic(topicId, analysis);
      
      // Update analysis with transaction hash
      await this.temperatureAnalysisModel.updateOne(
        { batchId: analysis.batchId },
        { chainTxHash: result.transactionId }
      );

      this.logger.log(`🔗 Analysis submitted to topic ${topicId} with transaction ID: ${result.transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to submit analysis to topic ${topicId}:`, error);
      throw error;
    }
  }

  /**
   * Send reward tokens to device owner
   */
  private async sendRewardTokens(device: Device): Promise<void> {
    try {
      // Get reward configuration
      const config = await this.configModel.findOne().exec();
      if (!config) {
        throw new Error('Configuration not found');
      }

      const rewardConfig = config.reward_token_config;
      const operator = this.smartNodeCommonService.getOperator();
      const client = this.smartNodeCommonService.getClient();

      // Create token transfer transaction
      const transferTx = new TransferTransaction()
        .addTokenTransfer(rewardConfig.token_id, operator.accountId, -parseInt(rewardConfig.reward_per_submission))
        .addTokenTransfer(rewardConfig.token_id, device.hederaAccount, parseInt(rewardConfig.reward_per_submission))
        .freezeWith(client);

      // Sign and execute transaction
      const result = await this.smartNodeCommonService.signAndExecuteTransaction(transferTx);

      this.logger.log(`💰 Sent ${rewardConfig.reward_per_submission} reward tokens to ${device.hederaAccount}. Transaction ID: ${result.transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to send reward tokens to ${device.hederaAccount}:`, error);
      // Don't throw here - we don't want to fail the entire process if reward sending fails
    }
  }

  /**
   * Get device location
   */
  private async getDeviceLocation(deviceId: string): Promise<{ latitude: number; longitude: number } | undefined> {
    try {
      const device = await this.deviceModel.findOne({ deviceId }).exec();
      if (device?.location?.coordinates) {
        return {
          longitude: device.location.coordinates[0],
          latitude: device.location.coordinates[1]
        };
      }
    } catch (error) {
      this.logger.warn(`Could not get location for device ${deviceId}:`, error);
    }
    return undefined;
  }

  /**
   * Generate mock temperature data
   */
  private generateMockTemperature(): number {
    // Generate realistic temperature between 15-30°C with some noise
    const baseTemp = 22.5;
    const variation = 7.5;
    const noise = (Math.random() - 0.5) * 2; // -1 to 1
    return parseFloat((baseTemp + (Math.random() - 0.5) * variation + noise).toFixed(2));
  }
}