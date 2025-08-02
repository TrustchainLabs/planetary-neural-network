import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateDHT11ReadingDto } from './dto/create-dht11-reading.dto';
import { DHT11Reading, DHT11ReadingDocument } from './entities/dht11-reading.entity';
import { TemperatureMachineLearningService } from './temperature-ml.service';

@Injectable()
export class DHT11SensorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DHT11SensorService.name);
  private readonly BATCH_SIZE = 10; // Number of readings before triggering AI analysis
  private isRunning = false;

  constructor(
    @InjectModel(DHT11Reading.name)
    private readonly dht11Model: Model<DHT11ReadingDocument>,
    private readonly temperatureMlService: TemperatureMachineLearningService,
    @InjectQueue('temperature-processing') private readonly processingQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('DHT11 sensor service initialized');
  }

  async onModuleDestroy() {
    this.logger.log('DHT11 sensor service destroyed');
  }

  /**
   * Creates a new DHT11 reading from Raspberry Pi sensor data
   */
  async createReading(createDto: CreateDHT11ReadingDto): Promise<DHT11Reading> {
    const reading = new this.dht11Model({
      ...createDto,
      timestamp: createDto.timestamp || new Date(),
    });

    const savedReading = await reading.save();
    
    this.logger.log(`DHT11 reading saved: Temp: ${savedReading.temperature}°C, Humidity: ${savedReading.humidity}%`);
    
    // Check if we have enough readings for batch processing
    await this.checkForBatchProcessing(savedReading.deviceId);

    return savedReading;
  }

  /**
   * Gets the latest DHT11 reading for a device
   */
  async getLatestReading(deviceId: string): Promise<DHT11Reading | null> {
    return await this.dht11Model.findOne({ deviceId }).sort({ timestamp: -1 }).exec();
  }

  /**
   * Gets DHT11 readings with optional filters
   */
  async findReadings(deviceId?: string, limit?: number, startDate?: Date, endDate?: Date): Promise<DHT11Reading[]> {
    const query: any = {};

    if (deviceId) {
      query.deviceId = deviceId;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    let queryBuilder = this.dht11Model.find(query).sort({ timestamp: -1 });

    if (limit) {
      queryBuilder = queryBuilder.limit(limit);
    }

    return await queryBuilder.exec();
  }

  /**
   * Gets DHT11 statistics for a device
   */
  async getDHT11Stats(deviceId: string, hours: number = 24): Promise<any> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (hours * 60 * 60 * 1000));
    
    const readings = await this.findReadings(deviceId, undefined, startDate, endDate);

    if (readings.length === 0) {
      return null;
    }

    const temperatures = readings.map(r => r.temperature);
    const humidities = readings.map(r => r.humidity);

    const tempAvg = temperatures.reduce((sum, val) => sum + val, 0) / temperatures.length;
    const humidityAvg = humidities.reduce((sum, val) => sum + val, 0) / humidities.length;

    return {
      count: readings.length,
      temperature: {
        average: Math.round(tempAvg * 100) / 100,
        minimum: Math.min(...temperatures),
        maximum: Math.max(...temperatures),
      },
      humidity: {
        average: Math.round(humidityAvg * 100) / 100,
        minimum: Math.min(...humidities),
        maximum: Math.max(...humidities),
      },
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
    const unprocessedCount = await this.dht11Model.countDocuments({
      deviceId,
      processed: false,
    });
    
    this.logger.debug(`Device ${deviceId} has ${unprocessedCount} unprocessed DHT11 readings`);

    if (unprocessedCount >= this.BATCH_SIZE) {
      this.logger.log(`Triggering batch AI analysis for device ${deviceId} with ${unprocessedCount} readings`);
      await this.triggerBatchAnalysis(deviceId);
    }
  }

  /**
   * Triggers batch AI analysis for accumulated readings
   */
  private async triggerBatchAnalysis(deviceId: string): Promise<void> {
    const batchId = `dht11_batch_${deviceId}_${Date.now()}`;
    
    await this.processingQueue.add('process-dht11-batch', {
      deviceId,
      batchId,
      batchSize: this.BATCH_SIZE,
    });
  }

  /**
   * Manual method to trigger batch processing for testing
   */
  async processBatch(deviceId: string): Promise<void> {
    const batchId = `manual_dht11_batch_${deviceId}_${Date.now()}`;
    await this.processingQueue.add('process-dht11-batch', {
      deviceId,
      batchId,
      batchSize: this.BATCH_SIZE,
    });
  }

  /**
   * Gets sensor status and information
   */
  async getSensorStatus(): Promise<any> {
    const latestReading = await this.getLatestReading('pi4-dht11-001');
    const totalReadings = await this.dht11Model.countDocuments();
    
    return {
      status: 'active',
      sensorType: 'DHT11',
      platform: 'Raspberry Pi 4',
      gpioPin: 4, // D4
      lastReading: latestReading ? {
        temperature: latestReading.temperature,
        humidity: latestReading.humidity,
        timestamp: latestReading.timestamp,
      } : null,
      totalReadings,
      batchSize: this.BATCH_SIZE,
      timestamp: new Date(),
    };
  }

  /**
   * Simulates DHT11 sensor data for testing (when no physical sensor is available)
   */
  async generateMockDHT11Reading(deviceId: string = 'pi4-dht11-001'): Promise<DHT11Reading> {
    // Generate realistic temperature and humidity values
    const baseTemp = 22; // Room temperature
    const baseHumidity = 45; // Room humidity
    const tempVariation = 5; // ±5 degrees variation
    const humidityVariation = 15; // ±15% variation
    
    const tempNoise = (Math.random() - 0.5) * 2; // Small random noise ±1
    const humidityNoise = (Math.random() - 0.5) * 3; // Small random noise ±1.5
    
    const temperature = baseTemp + (Math.sin(Date.now() / 100000) * tempVariation) + tempNoise;
    const humidity = baseHumidity + (Math.cos(Date.now() / 80000) * humidityVariation) + humidityNoise;
    
    const roundedTemp = Math.round(temperature * 100) / 100;
    const roundedHumidity = Math.round(humidity * 100) / 100;

    const mockReading: CreateDHT11ReadingDto = {
      deviceId,
      temperature: roundedTemp,
      humidity: roundedHumidity,
      gpioPin: 4,
      sensorType: 'DHT11',
      location: {
        latitude: -23.5505, // São Paulo coordinates as example
        longitude: -46.6333,
      },
    };

    this.logger.debug(`Generated mock DHT11 reading: Temp: ${roundedTemp}°C, Humidity: ${roundedHumidity}%`);

    return await this.createReading(mockReading);
  }
} 