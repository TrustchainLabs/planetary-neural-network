import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePiHealthDto } from './dto/create-pi-health.dto';
import { PiHealth, PiHealthDocument } from './entities/pi-health.entity';
import { PiHealthMLService } from './pi-health-ml.service';

@Injectable()
export class PiHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PiHealthService.name);
  private readonly BATCH_SIZE = 10; // Number of readings before triggering AI analysis
  private isRunning = false;
  private readonly ENABLE_MOCK_SENSORS = process.env.ENABLE_MOCK_SENSORS === 'true';

  constructor(
    @InjectModel(PiHealth.name)
    private readonly piHealthModel: Model<PiHealthDocument>,
    private readonly piHealthMlService: PiHealthMLService,
    @InjectQueue('pi-health-analysis') private readonly processingQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Pi Health service initialized');
    
    if (this.ENABLE_MOCK_SENSORS) {
      this.logger.log('Mock sensors enabled - Pi health monitoring will use simulated data');
    } else {
      this.logger.log('Real sensor mode - Pi health monitoring will use actual system metrics');
    }
  }

  async onModuleDestroy() {
    this.logger.log('Pi Health service destroyed');
  }

  /**
   * Creates a new Pi health reading
   */
  async createHealthReading(createDto: CreatePiHealthDto): Promise<PiHealth> {
    // Analyze health data with ML
    const mlAnalysis = await this.piHealthMlService.analyzeHealthData(createDto);
    
    const healthReading = new this.piHealthModel({
      ...createDto,
      timestamp: createDto.timestamp || new Date(),
      alertLevel: mlAnalysis.alertLevel,
      alertMessage: this.generateAlertMessage(mlAnalysis),
      mlAnalysis: {
        riskScore: mlAnalysis.riskScore,
        anomalyDetected: mlAnalysis.anomalyDetected,
        prediction: mlAnalysis.prediction,
        confidence: mlAnalysis.confidence
      }
    });

    const savedReading = await healthReading.save();
    
    this.logger.log(`Pi health reading saved: CPU: ${savedReading.cpuTemperature}°C, Usage: ${savedReading.cpuUsage}%, Alert: ${savedReading.alertLevel}`);
    
    // Check if we have enough readings for batch processing
    await this.checkForBatchProcessing(savedReading.deviceId);

    // Send alert if critical
    if (savedReading.alertLevel === 'critical' || savedReading.alertLevel === 'emergency') {
      await this.sendAlert(savedReading);
    }

    return savedReading;
  }

  /**
   * Gets the latest health reading for a device
   */
  async getLatestHealthReading(deviceId: string): Promise<PiHealth | null> {
    return await this.piHealthModel.findOne({ deviceId }).sort({ timestamp: -1 }).exec();
  }

  /**
   * Gets health readings with optional filters
   */
  async findHealthReadings(deviceId?: string, limit?: number, startDate?: Date, endDate?: Date): Promise<PiHealth[]> {
    const query: any = {};

    if (deviceId) {
      query.deviceId = deviceId;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    let queryBuilder = this.piHealthModel.find(query).sort({ timestamp: -1 });

    if (limit) {
      queryBuilder = queryBuilder.limit(limit);
    }

    return await queryBuilder.exec();
  }

  /**
   * Gets health statistics for a device
   */
  async getHealthStats(deviceId: string, hours: number = 24): Promise<any> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (hours * 60 * 60 * 1000));
    
    const readings = await this.findHealthReadings(deviceId, undefined, startDate, endDate);

    if (readings.length === 0) {
      return null;
    }

    const cpuTemps = readings.map(r => r.cpuTemperature);
    const cpuUsage = readings.map(r => r.cpuUsage);
    const memoryUsage = readings.map(r => r.memoryUsage);
    const diskUsage = readings.map(r => r.diskUsage);

    const avgCpuTemp = cpuTemps.reduce((sum, val) => sum + val, 0) / cpuTemps.length;
    const avgCpuUsage = cpuUsage.reduce((sum, val) => sum + val, 0) / cpuUsage.length;
    const avgMemoryUsage = memoryUsage.reduce((sum, val) => sum + val, 0) / memoryUsage.length;
    const avgDiskUsage = diskUsage.reduce((sum, val) => sum + val, 0) / diskUsage.length;

    // Count alerts by level
    const alertCounts = readings.reduce((acc, reading) => {
      acc[reading.alertLevel] = (acc[reading.alertLevel] || 0) + 1;
      return acc;
    }, {} as any);

    return {
      count: readings.length,
      cpuTemperature: {
        average: Math.round(avgCpuTemp * 100) / 100,
        minimum: Math.min(...cpuTemps),
        maximum: Math.max(...cpuTemps),
      },
      cpuUsage: {
        average: Math.round(avgCpuUsage * 100) / 100,
        minimum: Math.min(...cpuUsage),
        maximum: Math.max(...cpuUsage),
      },
      memoryUsage: {
        average: Math.round(avgMemoryUsage * 100) / 100,
        minimum: Math.min(...memoryUsage),
        maximum: Math.max(...memoryUsage),
      },
      diskUsage: {
        average: Math.round(avgDiskUsage * 100) / 100,
        minimum: Math.min(...diskUsage),
        maximum: Math.max(...diskUsage),
      },
      alerts: alertCounts,
      timeRange: {
        start: startDate,
        end: endDate,
      },
    };
  }

  /**
   * Gets critical alerts
   */
  async getCriticalAlerts(deviceId?: string, limit: number = 50): Promise<PiHealth[]> {
    const query: any = {
      alertLevel: { $in: ['critical', 'emergency'] }
    };

    if (deviceId) {
      query.deviceId = deviceId;
    }

    return await this.piHealthModel.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Gets device health status
   */
  async getDeviceHealthStatus(deviceId: string): Promise<any> {
    const latestReading = await this.getLatestHealthReading(deviceId);
    const criticalAlerts = await this.getCriticalAlerts(deviceId, 5);
    const totalReadings = await this.piHealthModel.countDocuments({ deviceId });
    
    if (!latestReading) {
      return {
        status: 'unknown',
        message: 'No health data available',
        deviceId,
        timestamp: new Date(),
      };
    }

    const healthScore = this.calculateHealthScore(latestReading);

    return {
      status: this.getOverallStatus(latestReading.alertLevel),
      deviceId,
      healthScore,
      lastReading: {
        cpuTemperature: latestReading.cpuTemperature,
        cpuUsage: latestReading.cpuUsage,
        memoryUsage: latestReading.memoryUsage,
        diskUsage: latestReading.diskUsage,
        alertLevel: latestReading.alertLevel,
        timestamp: latestReading.timestamp,
      },
      criticalAlerts: criticalAlerts.length,
      totalReadings,
      mlAnalysis: latestReading.mlAnalysis,
      timestamp: new Date(),
    };
  }

  /**
   * Checks if we have enough readings for batch processing
   */
  private async checkForBatchProcessing(deviceId: string): Promise<void> {
    const unprocessedCount = await this.piHealthModel.countDocuments({
      deviceId,
      processed: false,
    });
    
    this.logger.debug(`Device ${deviceId} has ${unprocessedCount} unprocessed health readings`);

    if (unprocessedCount >= this.BATCH_SIZE) {
      this.logger.log(`Triggering batch AI analysis for device ${deviceId} with ${unprocessedCount} readings`);
      await this.triggerBatchAnalysis(deviceId);
    }
  }

  /**
   * Triggers batch AI analysis for accumulated readings
   */
  private async triggerBatchAnalysis(deviceId: string): Promise<void> {
    const batchId = `pi_health_batch_${deviceId}_${Date.now()}`;
    
    await this.processingQueue.add('process-pi-health-batch', {
      deviceId,
      batchId,
      batchSize: this.BATCH_SIZE,
    });
  }

  /**
   * Manual method to trigger batch processing for testing
   */
  async processBatch(deviceId: string): Promise<void> {
    const batchId = `manual_pi_health_batch_${deviceId}_${Date.now()}`;
    await this.processingQueue.add('process-pi-health-batch', {
      deviceId,
      batchId,
      batchSize: this.BATCH_SIZE,
    });
  }

  /**
   * Generate alert message based on ML analysis
   */
  private generateAlertMessage(mlAnalysis: any): string {
    if (mlAnalysis.alertLevel === 'emergency') {
      return `EMERGENCY: Critical system conditions detected. Risk score: ${mlAnalysis.riskScore}. Immediate attention required.`;
    } else if (mlAnalysis.alertLevel === 'critical') {
      return `CRITICAL: System health issues detected. Risk score: ${mlAnalysis.riskScore}. Monitor closely.`;
    } else if (mlAnalysis.alertLevel === 'warning') {
      return `WARNING: System showing signs of stress. Risk score: ${mlAnalysis.riskScore}. Consider optimization.`;
    } else {
      return `NORMAL: System operating within normal parameters. Risk score: ${mlAnalysis.riskScore}.`;
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(healthReading: PiHealth): Promise<void> {
    // TODO: Implement actual alert sending (email, SMS, webhook, etc.)
    this.logger.warn(`ALERT [${healthReading.alertLevel.toUpperCase()}]: ${healthReading.alertMessage}`);
    this.logger.warn(`Device: ${healthReading.deviceId}, CPU: ${healthReading.cpuTemperature}°C, Usage: ${healthReading.cpuUsage}%`);
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(reading: PiHealth): number {
    let score = 100;

    // Deduct points for high CPU temperature
    if (reading.cpuTemperature > 80) score -= 30;
    else if (reading.cpuTemperature > 70) score -= 20;
    else if (reading.cpuTemperature > 60) score -= 10;

    // Deduct points for high CPU usage
    if (reading.cpuUsage > 90) score -= 25;
    else if (reading.cpuUsage > 80) score -= 15;
    else if (reading.cpuUsage > 70) score -= 10;

    // Deduct points for high memory usage
    if (reading.memoryUsage > 90) score -= 25;
    else if (reading.memoryUsage > 80) score -= 15;
    else if (reading.memoryUsage > 70) score -= 10;

    // Deduct points for high disk usage
    if (reading.diskUsage > 95) score -= 20;
    else if (reading.diskUsage > 90) score -= 10;
    else if (reading.diskUsage > 80) score -= 5;

    return Math.max(0, score);
  }

  /**
   * Get overall status based on alert level
   */
  private getOverallStatus(alertLevel: string): string {
    switch (alertLevel) {
      case 'emergency':
        return 'critical';
      case 'critical':
        return 'warning';
      case 'warning':
        return 'degraded';
      default:
        return 'healthy';
    }
  }

  /**
   * Gets ML model status and information
   */
  async getMLStatus(): Promise<any> {
    const modelStatus = this.piHealthMlService.getModelStatus();
    const recentReadings = await this.findHealthReadings(undefined, 5);
    
    return {
      model: modelStatus,
      dataAvailable: recentReadings.length,
      batchSize: this.BATCH_SIZE,
      lastTraining: modelStatus.isTrained ? 'Recently trained' : 'Awaiting sufficient data',
      capabilities: [
        'Health risk assessment',
        'Anomaly detection',
        'Alert level prediction',
        'System load analysis',
        'Performance trend analysis'
      ],
      status: 'active',
      version: 'TensorFlow.js v4.x',
      timestamp: new Date(),
    };
  }

  /**
   * Simulates Pi health data for testing
   */
  async generateMockHealthReading(deviceId: string = 'pi4-device-001'): Promise<PiHealth> {
    // Generate realistic health data
    const baseCpuTemp = 45; // Base CPU temperature
    const baseCpuUsage = 30; // Base CPU usage
    const baseMemoryUsage = 50; // Base memory usage
    const baseDiskUsage = 60; // Base disk usage
    
    const tempVariation = 15; // ±15°C variation
    const usageVariation = 20; // ±20% variation
    
    const tempNoise = (Math.random() - 0.5) * 5; // Small random noise
    const usageNoise = (Math.random() - 0.5) * 10; // Small random noise
    
    const cpuTemperature = baseCpuTemp + (Math.sin(Date.now() / 100000) * tempVariation) + tempNoise;
    const cpuUsage = baseCpuUsage + (Math.cos(Date.now() / 80000) * usageVariation) + usageNoise;
    const memoryUsage = baseMemoryUsage + (Math.sin(Date.now() / 120000) * usageVariation) + usageNoise;
    const diskUsage = baseDiskUsage + (Math.cos(Date.now() / 150000) * 10) + (Math.random() - 0.5) * 5;
    
    const roundedCpuTemp = Math.round(cpuTemperature * 100) / 100;
    const roundedCpuUsage = Math.round(cpuUsage * 100) / 100;
    const roundedMemoryUsage = Math.round(memoryUsage * 100) / 100;
    const roundedDiskUsage = Math.round(diskUsage * 100) / 100;

    const mockReading: CreatePiHealthDto = {
      deviceId,
      cpuTemperature: roundedCpuTemp,
      cpuUsage: roundedCpuUsage,
      memoryUsage: roundedMemoryUsage,
      diskUsage: roundedDiskUsage,
      loadAverage1m: Math.random() * 2,
      loadAverage5m: Math.random() * 1.5,
      loadAverage15m: Math.random() * 1,
      uptime: Math.random() * 86400, // Random uptime up to 24 hours
      voltage: 4.8 + (Math.random() - 0.5) * 0.4, // Voltage between 4.6-5.0V
      frequency: 1400 + (Math.random() - 0.5) * 200, // Frequency between 1300-1500MHz
      location: {
        latitude: -23.5505,
        longitude: -46.6333,
      },
    };

    this.logger.debug(`Generated mock health reading: CPU: ${roundedCpuTemp}°C, Usage: ${roundedCpuUsage}%`);

    return await this.createHealthReading(mockReading);
  }

  /**
   * Store analysis results for device
   */
  async storeAnalysisResult(deviceId: string, analysisData: any): Promise<void> {
    try {
      // Store analysis result in database or log it
      this.logger.log(`Stored analysis result for device ${deviceId}: ${analysisData.type}`);
      
      // Here you could store in a separate analysis collection
      // For now, just log the result
    } catch (error) {
      this.logger.error(`Failed to store analysis result for device ${deviceId}:`, error);
    }
  }

  /**
   * Get historical data for analysis
   */
  async getHistoricalData(deviceId: string, hours: number): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);
      
      return await this.piHealthModel.find({
        deviceId,
        timestamp: { $gte: startDate }
      }).sort({ timestamp: 1 }).exec();
    } catch (error) {
      this.logger.error(`Failed to get historical data for device ${deviceId}:`, error);
      return [];
    }
  }

  /**
   * Update device health score
   */
  async updateDeviceHealthScore(deviceId: string, healthScore: any): Promise<void> {
    try {
      this.logger.log(`Updated health score for device ${deviceId}: ${healthScore.score}/100`);
      
      // Here you could update a device health score collection
      // For now, just log the update
    } catch (error) {
      this.logger.error(`Failed to update health score for device ${deviceId}:`, error);
    }
  }

  /**
   * Submit health data to blockchain for rewards
   */
  async submitHealthDataToBlockchain(
    deviceId: string, 
    accountId: string, 
    healthMetrics: any, 
    rewardAmount: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      this.logger.log(`Submitting health data to blockchain for device ${deviceId}`);
      
      // Here you would implement the actual blockchain submission
      // For now, return a mock success response
      return {
        success: true,
        txHash: `mock-tx-${Date.now()}`,
      };
    } catch (error) {
      this.logger.error(`Failed to submit health data to blockchain for device ${deviceId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Log health alert
   */
  async logHealthAlert(deviceId: string, alertType: string, data: any): Promise<void> {
    try {
      this.logger.warn(`Health alert logged for device ${deviceId}: ${alertType}`, data);
      
      // Here you could store alerts in a separate collection
      // For now, just log the alert
    } catch (error) {
      this.logger.error(`Failed to log health alert for device ${deviceId}:`, error);
    }
  }
} 