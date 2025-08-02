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
import { DHT11SensorService } from './dht11-sensor.service';
import { CreateDHT11ReadingDto } from './dto/create-dht11-reading.dto';

@Controller('dht11-sensor')
export class DHT11SensorController {
  private readonly logger = new Logger(DHT11SensorController.name);

  constructor(
    private readonly dht11SensorService: DHT11SensorService,
  ) {}

  /**
   * Endpoint for Raspberry Pi 4 to send DHT11 sensor data
   */
  @Post('readings')
  @HttpCode(HttpStatus.CREATED)
  async createReading(@Body() createDto: CreateDHT11ReadingDto) {
    this.logger.log('DHT11 reading received from Raspberry Pi', {
      deviceId: createDto.deviceId,
      temperature: createDto.temperature,
      humidity: createDto.humidity,
    });
    return await this.dht11SensorService.createReading(createDto);
  }

  /**
   * Get DHT11 readings with optional filters
   */
  @Get('readings')
  async getReadings(
    @Query('deviceId') deviceId?: string,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.logger.log('DHT11 readings requested', { deviceId, limit });
    
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const limitNum = limit ? parseInt(limit.toString()) : undefined;
    
    return await this.dht11SensorService.findReadings(deviceId, limitNum, start, end);
  }

  /**
   * Get the latest DHT11 reading for a device
   */
  @Get('readings/latest/:deviceId')
  async getLatestReading(@Param('deviceId') deviceId: string) {
    this.logger.log(`Latest DHT11 reading requested for device: ${deviceId}`);
    return await this.dht11SensorService.getLatestReading(deviceId);
  }

  /**
   * Get DHT11 statistics for a device
   */
  @Get('stats/:deviceId')
  async getDHT11Stats(
    @Param('deviceId') deviceId: string,
    @Query('hours') hours?: number,
  ) {
    const hoursToAnalyze = hours ? parseInt(hours.toString()) : 24;
    this.logger.log(`DHT11 stats requested for device: ${deviceId}, hours: ${hoursToAnalyze}`);
    return await this.dht11SensorService.getDHT11Stats(deviceId, hoursToAnalyze);
  }

  /**
   * Get sensor status and information
   */
  @Get('status')
  async getSensorStatus() {
    this.logger.log('DHT11 sensor status requested');
    return await this.dht11SensorService.getSensorStatus();
  }

  /**
   * Manually trigger batch processing for a device (for testing)
   */
  @Post('batch/:deviceId/process')
  @HttpCode(HttpStatus.OK)
  async processBatch(@Param('deviceId') deviceId: string) {
    this.logger.log(`Manual DHT11 batch processing requested for device: ${deviceId}`);
    await this.dht11SensorService.processBatch(deviceId);
    return {
      status: 'success',
      message: 'DHT11 batch processing queued',
      deviceId,
      timestamp: new Date(),
    };
  }

  /**
   * Generate mock DHT11 reading for testing
   */
  @Post('mock/reading')
  @HttpCode(HttpStatus.CREATED)
  async generateMockReading(@Query('deviceId') deviceId?: string) {
    const targetDeviceId = deviceId || 'pi4-dht11-001';
    this.logger.log(`Mock DHT11 reading requested for device: ${targetDeviceId}`);
    return await this.dht11SensorService.generateMockDHT11Reading(targetDeviceId);
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'healthy',
      service: 'dht11-sensor',
      timestamp: new Date(),
      version: '1.0.0',
      sensorType: 'DHT11',
      platform: 'Raspberry Pi 4',
    };
  }
} 