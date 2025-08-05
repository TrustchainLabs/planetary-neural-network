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
import { DataCollectionService } from './data-collection.service';
import { StartDataCollectionDto } from './dto/start-data-collection.dto';
import { StopDataCollectionDto } from './dto/stop-data-collection.dto';

@Controller('sensors')
export class SensorsController {
  private readonly logger = new Logger(SensorsController.name);

  constructor(
    private readonly dataCollectionService: DataCollectionService,
  ) {}

  /**
   * Start data collection for a device
   */
  @Post('data-collection/start')
  @HttpCode(HttpStatus.OK)
  async startDataCollection(@Body() dto: StartDataCollectionDto) {
    this.logger.log(`Data collection start requested for device: ${dto.deviceId}`);
    return await this.dataCollectionService.startDataCollection(dto);
  }

  /**
   * Stop data collection for a device
   */
  @Post('data-collection/stop')
  @HttpCode(HttpStatus.OK)
  async stopDataCollection(@Body() dto: StopDataCollectionDto) {
    this.logger.log(`Data collection stop requested for device: ${dto.deviceId}`);
    return await this.dataCollectionService.stopDataCollection(dto);
  }

  /**
   * Get active data collection sessions
   */
  @Get('data-collection/sessions')
  async getActiveSessions() {
    this.logger.log('Active sessions requested');
    const activeSessions = this.dataCollectionService.getActiveSessions();
    return {
      active_sessions: activeSessions,
      count: activeSessions.length,
      timestamp: new Date()
    };
  }

  /**
   * Get data collection status for a specific device
   */
  @Get('data-collection/status/:deviceId')
  async getDataCollectionStatus(@Param('deviceId') deviceId: string) {
    this.logger.log(`Data collection status requested for device: ${deviceId}`);
    const status = this.dataCollectionService.getSessionStatus(deviceId);
    return {
      device_id: deviceId,
      ...status,
      timestamp: new Date()
    };
  }

  /**
   * Get sensor system status
   */
  @Get('status')
  async getSystemStatus() {
    const activeSessions = this.dataCollectionService.getActiveSessions();
    return {
      status: 'running',
      active_sessions: activeSessions.length,
      interval: '10 seconds',
      timestamp: new Date(),
    };
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'healthy',
      service: 'sensors-data-collection',
      timestamp: new Date(),
      version: '2.0.0',
    };
  }

  /**
   * Debug endpoint to check current data collection status
   */
  @Get('debug/status')
  async getDebugStatus() {
    const activeSessions = this.dataCollectionService.getActiveSessions();
    const sessionDetails = activeSessions.map(deviceId => 
      this.dataCollectionService.getSessionStatus(deviceId)
    );

    return {
      debug: true,
      active_sessions_count: activeSessions.length,
      active_sessions: activeSessions,
      session_details: sessionDetails,
      cron_interval: '10 seconds',
      batch_size: 10,
      timestamp: new Date()
    };
  }

  /**
   * Force restart data collection for active devices
   */
  @Post('debug/restart-collection')
  @HttpCode(HttpStatus.OK)
  async restartDataCollection() {
    try {
      await (this.dataCollectionService as any).startDataCollectionForActiveDevices();
      return {
        status: 'success',
        message: 'Data collection restarted for active devices',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date()
      };
    }
  }
} 