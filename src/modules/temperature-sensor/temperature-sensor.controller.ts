import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { TemperatureSensorService } from './temperature-sensor.service';
import { CreateTemperatureReadingDto } from './dto/create-temperature-reading.dto';
import { ReadTemperatureReadingsDto } from './dto/read-temperature-readings.dto';

@Controller('temperature-sensor')
export class TemperatureSensorController {
  private readonly logger = new Logger(TemperatureSensorController.name);

  constructor(
    private readonly temperatureSensorService: TemperatureSensorService,
  ) {}

  /**
   * Manually create a temperature reading (for testing)
   */
  @Post('readings')
  @HttpCode(HttpStatus.CREATED)
  async createReading(@Body() createDto: CreateTemperatureReadingDto) {
    this.logger.log('Manual temperature reading creation requested');
    return await this.temperatureSensorService.createReading(createDto);
  }

  /**
   * Get temperature readings with optional filters
   */
  @Get('readings')
  async getReadings(@Query() filters: ReadTemperatureReadingsDto) {
    this.logger.log('Temperature readings requested', filters);
    return await this.temperatureSensorService.findReadings(filters);
  }

  /**
   * Get the latest temperature reading for a device
   */
  @Get('readings/latest/:deviceId')
  async getLatestReading(@Param('deviceId') deviceId: string) {
    this.logger.log(`Latest reading requested for device: ${deviceId}`);
    return await this.temperatureSensorService.getLatestReading(deviceId);
  }

  /**
   * Get temperature statistics for a device
   */
  @Get('stats/:deviceId')
  async getTemperatureStats(
    @Param('deviceId') deviceId: string,
    @Query('hours') hours?: number,
  ) {
    const hoursToAnalyze = hours ? parseInt(hours.toString()) : 24;
    this.logger.log(`Stats requested for device: ${deviceId}, hours: ${hoursToAnalyze}`);
    return await this.temperatureSensorService.getTemperatureStats(deviceId, hoursToAnalyze);
  }

  /**
   * Start the sensor simulation
   */
  @Post('sensor/start')
  @HttpCode(HttpStatus.OK)
  async startSensorSimulation() {
    this.logger.log('Sensor simulation start requested');
    await this.temperatureSensorService.startSensorSimulation();
    return {
      status: 'success',
      message: 'Temperature sensor simulation started',
      timestamp: new Date(),
    };
  }

  /**
   * Stop the sensor simulation
   */
  @Post('sensor/stop')
  @HttpCode(HttpStatus.OK)
  async stopSensorSimulation() {
    this.logger.log('Sensor simulation stop requested');
    this.temperatureSensorService.stopSensorSimulation();
    return {
      status: 'success',
      message: 'Temperature sensor simulation stopped',
      timestamp: new Date(),
    };
  }

  /**
   * Get sensor status
   */
  @Get('sensor/status')
  async getSensorStatus() {
    // Simple status check - in real implementation you'd check the service state
    return {
      status: 'running', // TODO: Get actual status from service
      interval: '10 seconds',
      lastReading: await this.temperatureSensorService.getLatestReading('mock-device-001'),
      timestamp: new Date(),
    };
  }

  /**
   * Manually trigger batch processing for a device (for testing)
   */
  @Post('batch/:deviceId/process')
  @HttpCode(HttpStatus.OK)
  async processBatch(@Param('deviceId') deviceId: string) {
    this.logger.log(`Manual batch processing requested for device: ${deviceId}`);
    await this.temperatureSensorService.processBatch(deviceId);
    return {
      status: 'success',
      message: 'Batch processing queued',
      deviceId,
      timestamp: new Date(),
    };
  }

  /**
   * Get temperature analyses (AI analysis results)
   */
  @Get('analyses')
  async getAnalyses(@Query('deviceId') deviceId?: string, @Query('limit') limit?: number) {
    this.logger.log('Temperature analyses requested', { deviceId, limit });
    return await this.temperatureSensorService.getAnalyses(deviceId, limit);
  }

  /**
   * Get the latest temperature analysis for a device
   */
  @Get('analyses/latest/:deviceId')
  async getLatestAnalysis(@Param('deviceId') deviceId: string) {
    this.logger.log(`Latest analysis requested for device: ${deviceId}`);
    return await this.temperatureSensorService.getLatestAnalysis(deviceId);
  }

  /**
   * Manually trigger processing of a specific reading (deprecated - for backward compatibility)
   */
  @Post('readings/:readingId/process')
  @HttpCode(HttpStatus.OK)
  async processReading(@Param('readingId') readingId: string) {
    this.logger.log(`Manual processing requested for reading: ${readingId} (deprecated)`);
    await this.temperatureSensorService.processReading(readingId);
    return {
      status: 'warning',
      message: 'Individual reading processing is deprecated. Use batch processing instead.',
      readingId,
      timestamp: new Date(),
    };
  }

  /**
   * Get ML model status and information
   */
  @Get('ml/status')
  async getMLStatus() {
    this.logger.log('ML model status requested');
    return await this.temperatureSensorService.getMLStatus();
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'healthy',
      service: 'temperature-sensor',
      timestamp: new Date(),
      version: '1.0.0',
    };
  }
} 