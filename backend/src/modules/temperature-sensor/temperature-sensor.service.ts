import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTemperatureReadingDto } from './dto/create-temperature-reading.dto';
import { ReadTemperatureReadingsDto } from './dto/read-temperature-readings.dto';
import { CreateDHT11ReadingDto } from './dto/create-dht11-reading.dto';
import { TemperatureReading } from './entities/temperature-reading.entity';
import { DHT11Reading, DHT11ReadingDocument } from './entities/dht11-reading.entity';
import { TemperatureSensorModelService } from './temperature-sensor.model.service';
import { TemperatureMachineLearningService } from './temperature-ml.service';

@Injectable()
export class TemperatureSensorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemperatureSensorService.name);
  private sensorInterval: NodeJS.Timeout;
  private readonly SENSOR_INTERVAL_MS = 10000; // 10 seconds
  private readonly BATCH_SIZE = 10; // Number of readings before triggering AI analysis
  private isRunning = false;
  private readonly ENABLE_MOCK_SENSORS = process.env.ENABLE_MOCK_SENSORS === 'true';

  constructor(
    private readonly temperatureModelService: TemperatureSensorModelService,
    private readonly temperatureMlService: TemperatureMachineLearningService,
    @InjectQueue('temperature-analysis') private readonly processingQueue: Queue,
    @InjectModel(DHT11Reading.name)
    private readonly dht11Model: Model<DHT11ReadingDocument>,
  ) {}

  async onModuleInit() {
    this.logger.log('Temperature sensor service initialized');
    
    if (this.ENABLE_MOCK_SENSORS) {
      this.logger.log('Mock sensors enabled - starting simulation');
      await this.startSensorSimulation();
    } else {
      this.logger.log('Real sensor mode - detecting available sensors');
      await this.detectAndStartSensors();
    }
  }

  async onModuleDestroy() {
    this.stopSensorSimulation();
  }

  /**
   * Detects and starts real sensors
   */
  async detectAndStartSensors(): Promise<void> {
    this.logger.log('Detecting available temperature sensors...');
    
    try {
      // Check for DHT11/DHT22 sensors
      const dhtSensors = await this.detectDHTSensors();
      
      // Check for other temperature sensors (DS18B20, etc.)
      const otherSensors = await this.detectOtherSensors();
      
      const totalSensors = dhtSensors.length + otherSensors.length;
      
      if (totalSensors === 0) {
        this.logger.warn('No temperature sensors detected. Please check sensor connections.');
        this.logger.log('To enable mock sensors for testing, set ENABLE_MOCK_SENSORS=true');
        return;
      }
      
      this.logger.log(`Found ${totalSensors} temperature sensor(s)`);
      
      // Start monitoring for each detected sensor
      await this.startSensorMonitoring(dhtSensors, otherSensors);
      
    } catch (error) {
      this.logger.error('Error detecting sensors:', error);
      this.logger.log('To enable mock sensors for testing, set ENABLE_MOCK_SENSORS=true');
    }
  }

  /**
   * Detects DHT11/DHT22 sensors
   */
  private async detectDHTSensors(): Promise<string[]> {
    const sensors: string[] = [];
    
    try {
      // Check common DHT11/DHT22 GPIO pins
      const dhtPins = [4, 17, 18, 27, 22, 23, 24, 25]; // Common Raspberry Pi GPIO pins
      
      for (const pin of dhtPins) {
        try {
          // This would typically use a library like 'node-dht-sensor'
          // For now, we'll simulate detection
          const isConnected = await this.checkDHTSensor(pin);
          if (isConnected) {
            sensors.push(`DHT11_GPIO${pin}`);
            this.logger.log(`DHT sensor detected on GPIO ${pin}`);
          }
        } catch (error) {
          // Pin not available or sensor not connected
        }
      }
    } catch (error) {
      this.logger.debug('DHT sensor detection failed:', error);
    }
    
    return sensors;
  }

  /**
   * Detects other temperature sensors (DS18B20, etc.)
   */
  private async detectOtherSensors(): Promise<string[]> {
    const sensors: string[] = [];
    
    try {
      // Check for DS18B20 sensors (1-wire interface)
      const ds18b20Sensors = await this.checkDS18B20Sensors();
      sensors.push(...ds18b20Sensors);
      
      // Check for I2C temperature sensors
      const i2cSensors = await this.checkI2CSensors();
      sensors.push(...i2cSensors);
      
    } catch (error) {
      this.logger.debug('Other sensor detection failed:', error);
    }
    
    return sensors;
  }

  /**
   * Checks if a DHT sensor is connected to a specific GPIO pin
   */
  private async checkDHTSensor(pin: number): Promise<boolean> {
    // This is a placeholder for actual DHT sensor detection
    // In a real implementation, you would use a library like 'node-dht-sensor'
    // and try to read from the sensor
    
    try {
      // Simulate sensor check (replace with actual implementation)
      // const sensor = require('node-dht-sensor');
      // const reading = sensor.read(11, pin); // 11 for DHT11, 22 for DHT22
      // return reading.temperature > -40 && reading.temperature < 80;
      
      // For now, return false to indicate no sensors found
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks for DS18B20 sensors
   */
  private async checkDS18B20Sensors(): Promise<string[]> {
    const sensors: string[] = [];
    
    try {
      // Check 1-wire interface for DS18B20 sensors
      // This would typically read from /sys/bus/w1/devices/
      // For now, return empty array
      return sensors;
    } catch (error) {
      this.logger.debug('DS18B20 detection failed:', error);
      return sensors;
    }
  }

  /**
   * Checks for I2C temperature sensors
   */
  private async checkI2CSensors(): Promise<string[]> {
    const sensors: string[] = [];
    
    try {
      // Check I2C bus for temperature sensors
      // This would typically use 'i2c-bus' library
      // For now, return empty array
      return sensors;
    } catch (error) {
      this.logger.debug('I2C sensor detection failed:', error);
      return sensors;
    }
  }

  /**
   * Starts monitoring for detected sensors
   */
  private async startSensorMonitoring(dhtSensors: string[], otherSensors: string[]): Promise<void> {
    const allSensors = [...dhtSensors, ...otherSensors];
    
    this.logger.log(`Starting monitoring for ${allSensors.length} sensor(s)`);
    
    this.isRunning = true;
    
    this.sensorInterval = setInterval(async () => {
      try {
        await this.readAllSensors(allSensors);
      } catch (error) {
        this.logger.error('Error reading sensors:', error);
      }
    }, this.SENSOR_INTERVAL_MS);
  }

  /**
   * Reads from all detected sensors
   */
  private async readAllSensors(sensors: string[]): Promise<void> {
    for (const sensorId of sensors) {
      try {
        const reading = await this.readSensor(sensorId);
        if (reading) {
          await this.createReading(reading);
          await this.checkForBatchProcessing(reading.deviceId);
        }
      } catch (error) {
        this.logger.error(`Error reading sensor ${sensorId}:`, error);
      }
    }
  }

  /**
   * Reads from a specific sensor
   */
  private async readSensor(sensorId: string): Promise<CreateTemperatureReadingDto | null> {
    try {
      // This would be implemented based on the sensor type
      // For now, return null to indicate no real sensors
      return null;
    } catch (error) {
      this.logger.error(`Failed to read sensor ${sensorId}:`, error);
      return null;
    }
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

  /**
   * Get historical readings for analysis
   */
  async getHistoricalReadings(deviceId: string, hours: number): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);
      
      return await this.temperatureModelService.findAll({
        deviceId,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        limit: hours * 6 // Assuming 1 reading per 10 minutes
      });
    } catch (error) {
      this.logger.error(`Failed to get historical readings for device ${deviceId}:`, error);
      return [];
    }
  }

  /**
   * Submit climate data to blockchain for rewards
   */
  async submitClimateDataToBlockchain(
    deviceId: string,
    accountId: string,
    aggregatedData: any,
    submissionPeriod: { start: Date; end: Date }
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      this.logger.log(`Submitting climate data to blockchain for device ${deviceId}`);
      
      // Here you would implement the actual blockchain submission
      // For now, return a mock success response
      return {
        success: true,
        txHash: `mock-climate-tx-${Date.now()}`,
      };
    } catch (error) {
      this.logger.error(`Failed to submit climate data to blockchain for device ${deviceId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Claim temperature monitoring reward
   */
  async claimTemperatureReward(
    deviceId: string,
    accountId: string,
    rewardAmount: string,
    qualityScore: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      this.logger.log(`Claiming temperature reward for device ${deviceId}: ${rewardAmount} tokens`);
      
      // Here you would implement the actual reward claim
      // For now, return a mock success response
      return {
        success: true,
        txHash: `mock-reward-tx-${Date.now()}`,
      };
    } catch (error) {
      this.logger.error(`Failed to claim temperature reward for device ${deviceId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Log climate alert
   */
  async logClimateAlert(deviceId: string, alertType: string, data: any): Promise<void> {
    try {
      this.logger.warn(`Climate alert logged for device ${deviceId}: ${alertType}`, data);
      
      // Here you could store alerts in a separate collection
      // For now, just log the alert
    } catch (error) {
      this.logger.error(`Failed to log climate alert for device ${deviceId}:`, error);
    }
  }

  // ==================== DHT11 SENSOR METHODS ====================

  /**
   * Creates a new DHT11 reading from Raspberry Pi sensor data
   */
  async createDHT11Reading(createDto: CreateDHT11ReadingDto): Promise<DHT11Reading> {
    const reading = new this.dht11Model({
      ...createDto,
      timestamp: createDto.timestamp || new Date(),
    });

    const savedReading = await reading.save();
    
    this.logger.log(`DHT11 reading saved: Temp: ${savedReading.temperature}°C, Humidity: ${savedReading.humidity}%`);
    
    // Check if we have enough readings for batch processing
    await this.checkForDHT11BatchProcessing(savedReading.deviceId);

    return savedReading;
  }

  /**
   * Gets the latest DHT11 reading for a device
   */
  async getLatestDHT11Reading(deviceId: string): Promise<DHT11Reading | null> {
    return await this.dht11Model.findOne({ deviceId }).sort({ timestamp: -1 }).exec();
  }

  /**
   * Gets DHT11 readings with optional filters
   */
  async findDHT11Readings(deviceId?: string, limit?: number, startDate?: Date, endDate?: Date): Promise<DHT11Reading[]> {
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
    
    const readings = await this.findDHT11Readings(deviceId, undefined, startDate, endDate);

    if (readings.length === 0) {
      return null;
    }

    const temperatures = readings.map(r => r.temperature);
    const humidities = readings.map(r => r.humidity);

    const tempAvg = temperatures.reduce((sum, val) => sum + val, 0) / temperatures.length;
    const humidityAvg = humidities.reduce((sum, val) => sum + val, 0) / humidities.length;

    const tempMin = Math.min(...temperatures);
    const tempMax = Math.max(...temperatures);
    const humidityMin = Math.min(...humidities);
    const humidityMax = Math.max(...humidities);

    return {
      deviceId,
      period: `${hours} hours`,
      totalReadings: readings.length,
      temperature: {
        average: tempAvg,
        min: tempMin,
        max: tempMax,
        range: tempMax - tempMin,
      },
      humidity: {
        average: humidityAvg,
        min: humidityMin,
        max: humidityMax,
        range: humidityMax - humidityMin,
      },
      lastReading: readings[0],
      firstReading: readings[readings.length - 1],
    };
  }

  /**
   * Check if we have enough DHT11 readings for batch processing
   */
  private async checkForDHT11BatchProcessing(deviceId: string): Promise<void> {
    const unprocessedCount = await this.dht11Model.countDocuments({
      deviceId,
      processed: { $ne: true }
    });

    if (unprocessedCount >= this.BATCH_SIZE) {
      this.logger.log(`Triggering DHT11 batch analysis for device ${deviceId} with ${unprocessedCount} readings`);
      await this.triggerDHT11BatchAnalysis(deviceId);
    }
  }

  /**
   * Trigger DHT11 batch analysis
   */
  private async triggerDHT11BatchAnalysis(deviceId: string): Promise<void> {
    const batchId = `dht11_batch_${deviceId}_${Date.now()}`;
    
    await this.processingQueue.add('dht11-analysis', {
      deviceId,
      batchId,
      timestamp: new Date(),
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    this.logger.log(`DHT11 batch analysis queued: ${batchId}`);
  }

  /**
   * Process DHT11 batch for a device
   */
  async processDHT11Batch(deviceId: string): Promise<void> {
    this.logger.log(`Processing DHT11 batch for device: ${deviceId}`);
    
    // Get unprocessed readings
    const readings = await this.dht11Model.find({
      deviceId,
      processed: { $ne: true }
    }).sort({ timestamp: 1 }).limit(this.BATCH_SIZE).exec();

    if (readings.length === 0) {
      this.logger.log(`No unprocessed DHT11 readings for device: ${deviceId}`);
      return;
    }

    // Mark readings as processed
    await this.dht11Model.updateMany(
      { _id: { $in: readings.map(r => r._id) } },
      { processed: true }
    );

    this.logger.log(`Processed ${readings.length} DHT11 readings for device: ${deviceId}`);
  }

  /**
   * Get DHT11 sensor status and information
   */
  async getDHT11SensorStatus(): Promise<any> {
    const totalReadings = await this.dht11Model.countDocuments();
    const todayReadings = await this.dht11Model.countDocuments({
      timestamp: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    const latestReading = await this.dht11Model.findOne().sort({ timestamp: -1 });

    return {
      service: 'DHT11 Sensor Service',
      status: 'active',
      totalReadings,
      todayReadings,
      latestReading: latestReading ? {
        temperature: latestReading.temperature,
        humidity: latestReading.humidity,
        timestamp: latestReading.timestamp,
        deviceId: latestReading.deviceId,
      } : null,
      capabilities: [
        'temperature_reading',
        'humidity_reading',
        'real_time_monitoring',
        'data_logging',
        'batch_processing',
      ],
      version: '1.0.0',
    };
  }

  /**
   * Generate mock DHT11 reading for testing
   */
  async generateMockDHT11Reading(deviceId: string = 'pi4-dht11-001'): Promise<DHT11Reading> {
    const mockReading = {
      deviceId,
      temperature: 20 + Math.random() * 10, // 20-30°C
      humidity: 40 + Math.random() * 30, // 40-70%
      timestamp: new Date(),
      sensorType: 'DHT11',
      location: {
        latitude: -23.5505,
        longitude: -46.6333
      },
      accuracy: 0.5,
      batteryLevel: 85 + Math.random() * 15, // 85-100%
      signalStrength: -45 + Math.random() * 20, // -45 to -25 dBm
    };

    return await this.createDHT11Reading(mockReading);
  }
} 