import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CreateTemperatureReadingDto } from './dto/create-temperature-reading.dto';
import { ReadTemperatureReadingsDto } from './dto/read-temperature-readings.dto';
import { TemperatureReading } from './entities/temperature-reading.entity';
import { TemperatureSensorModelService } from './temperature-sensor.model.service';
import { TemperatureMachineLearningService } from './temperature-ml.service';

@Injectable()
export class TemperatureSensorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemperatureSensorService.name);
  private sensorInterval: NodeJS.Timeout;
  private readonly SENSOR_INTERVAL_MS = 10000; // 10 seconds
  private readonly BATCH_SIZE = 10; // Number of readings before triggering AI analysis
  private isRunning = false;

  constructor(
    private readonly temperatureModelService: TemperatureSensorModelService,
    private readonly temperatureMlService: TemperatureMachineLearningService,
    @InjectQueue('temperature-processing') private readonly processingQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Temperature sensor service initialized');
    await this.startSensorSimulation();
  }

  async onModuleDestroy() {
    this.stopSensorSimulation();
  }

  /**
   * Starts the mock sensor simulation
   */
  async startSensorSimulation(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Sensor simulation is already running');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting temperature sensor simulation...');
    
    this.sensorInterval = setInterval(async () => {
      try {
        await this.generateMockReading();
      } catch (error) {
        this.logger.error('Error generating mock reading:', error);
      }
    }, this.SENSOR_INTERVAL_MS);
  }

  /**
   * Stops the sensor simulation
   */
  stopSensorSimulation(): void {
    if (this.sensorInterval) {
      clearInterval(this.sensorInterval);
      this.isRunning = false;
      this.logger.log('Temperature sensor simulation stopped');
    }
  }

  /**
   * Generates a mock temperature reading
   */
  private async generateMockReading(): Promise<TemperatureReading> {
    // Generate realistic temperature values (between 15°C and 35°C with some variation)
    const baseTemp = 22; // Room temperature
    const variation = 8; // ±8 degrees variation
    const noise = (Math.random() - 0.5) * 2; // Small random noise ±1
    
    const temperature = baseTemp + (Math.sin(Date.now() / 100000) * variation) + noise;
    const roundedTemp = Math.round(temperature * 100) / 100; // Round to 2 decimal places

    const mockReading: CreateTemperatureReadingDto = {
      deviceId: 'mock-device-001', // TODO: Get from actual device configuration
      value: roundedTemp,
      timestamp: new Date(),
      location: {
        latitude: -23.5505, // São Paulo coordinates as example
        longitude: -46.6333,
      },
    };

    this.logger.debug(`Generated mock temperature reading: ${roundedTemp}°C`);

    // Save to database
    const savedReading = await this.createReading(mockReading);
    
    // Check if we have enough readings for batch processing
    await this.checkForBatchProcessing(savedReading.deviceId);

    return savedReading;
  }

  /**
   * Creates a new temperature reading
   */
  async createReading(createDto: CreateTemperatureReadingDto): Promise<TemperatureReading> {
    return await this.temperatureModelService.create(createDto);
  }

  /**
   * Retrieves temperature readings based on filters
   */
  async findReadings(filters: ReadTemperatureReadingsDto): Promise<TemperatureReading[]> {
    return await this.temperatureModelService.findAll(filters);
  }

  /**
   * Gets the latest temperature reading for a device
   */
  async getLatestReading(deviceId: string): Promise<TemperatureReading | null> {
    return await this.temperatureModelService.findLatest(deviceId);
  }

  /**
   * Gets temperature statistics for a device
   */
  async getTemperatureStats(deviceId: string, hours: number = 24): Promise<any> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (hours * 60 * 60 * 1000));
    
    const readings = await this.temperatureModelService.findAll({
      deviceId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    if (readings.length === 0) {
      return null;
    }

    const values = readings.map(r => r.value);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: readings.length,
      average: Math.round(avg * 100) / 100,
      minimum: min,
      maximum: max,
      timeRange: {
        start: startDate,
        end: endDate,
      },
    };
  }

  /**
   * Checks if we have enough readings for batch processing
   */
  private async checkForBatchProcessing(deviceId: string): Promise<void> {
    // Get unprocessed readings count
    const unprocessedCount = await this.temperatureModelService.getUnprocessedCount(deviceId);
    
    this.logger.debug(`Device ${deviceId} has ${unprocessedCount} unprocessed readings`);

    if (unprocessedCount >= this.BATCH_SIZE) {
      this.logger.log(`Triggering batch AI analysis for device ${deviceId} with ${unprocessedCount} readings`);
      await this.triggerBatchAnalysis(deviceId);
    }
  }

  /**
   * Triggers batch AI analysis for accumulated readings
   */
  private async triggerBatchAnalysis(deviceId: string): Promise<void> {
    const batchId = `batch_${deviceId}_${Date.now()}`;
    
    await this.processingQueue.add('process-temperature-batch', {
      deviceId,
      batchId,
      batchSize: this.BATCH_SIZE,
    });
  }

  /**
   * Manual method to trigger batch processing for testing
   */
  async processBatch(deviceId: string): Promise<void> {
    const batchId = `manual_batch_${deviceId}_${Date.now()}`;
    await this.processingQueue.add('process-temperature-batch', {
      deviceId,
      batchId,
      batchSize: this.BATCH_SIZE,
    });
  }

  /**
   * Gets temperature analyses with optional filters
   */
  async getAnalyses(deviceId?: string, limit?: number): Promise<any[]> {
    return await this.temperatureModelService.findAnalyses(deviceId, limit);
  }

  /**
   * Gets the latest temperature analysis for a device
   */
  async getLatestAnalysis(deviceId: string): Promise<any | null> {
    return await this.temperatureModelService.getLatestAnalysis(deviceId);
  }

  /**
   * Gets ML model status and information
   */
  async getMLStatus(): Promise<any> {
    const modelStatus = this.temperatureMlService.getModelStatus();
    const recentReadings = await this.temperatureModelService.findAll({ limit: 5 });
    
    return {
      model: modelStatus,
      dataAvailable: recentReadings.length,
      batchSize: this.BATCH_SIZE,
      lastTraining: modelStatus.isTrained ? 'Recently trained' : 'Awaiting sufficient data',
      capabilities: [
        'Time series prediction',
        'Anomaly detection',
        'Risk assessment',
        'Pattern recognition',
        'Confidence scoring'
      ],
      status: 'active',
      version: 'TensorFlow.js v4.x',
      timestamp: new Date(),
    };
  }

  /**
   * Manual method to trigger data processing for testing (deprecated - use batch processing)
   */
  async processReading(readingId: string): Promise<void> {
    this.logger.warn('Individual reading processing is deprecated. Use batch processing instead.');
    // Keep for backward compatibility but don't actually process
  }
} 