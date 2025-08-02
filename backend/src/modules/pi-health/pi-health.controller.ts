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
import { PiHealthService } from './pi-health.service';
import { CreatePiHealthDto } from './dto/create-pi-health.dto';

@Controller('pi-health')
export class PiHealthController {
  private readonly logger = new Logger(PiHealthController.name);

  constructor(
    private readonly piHealthService: PiHealthService,
  ) {}

  /**
   * Endpoint for Raspberry Pi to send health data
   */
  @Post('readings')
  @HttpCode(HttpStatus.CREATED)
  async createHealthReading(@Body() createDto: CreatePiHealthDto) {
    this.logger.log('Pi health reading received', {
      deviceId: createDto.deviceId,
      cpuTemperature: createDto.cpuTemperature,
      cpuUsage: createDto.cpuUsage,
    });
    return await this.piHealthService.createHealthReading(createDto);
  }

  /**
   * Get health readings with optional filters
   */
  @Get('readings')
  async getHealthReadings(
    @Query('deviceId') deviceId?: string,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.logger.log('Pi health readings requested', { deviceId, limit });
    
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const limitNum = limit ? parseInt(limit.toString()) : undefined;
    
    return await this.piHealthService.findHealthReadings(deviceId, limitNum, start, end);
  }

  /**
   * Get the latest health reading for a device
   */
  @Get('readings/latest/:deviceId')
  async getLatestHealthReading(@Param('deviceId') deviceId: string) {
    this.logger.log(`Latest health reading requested for device: ${deviceId}`);
    return await this.piHealthService.getLatestHealthReading(deviceId);
  }

  /**
   * Get health statistics for a device
   */
  @Get('stats/:deviceId')
  async getHealthStats(
    @Param('deviceId') deviceId: string,
    @Query('hours') hours?: number,
  ) {
    const hoursToAnalyze = hours ? parseInt(hours.toString()) : 24;
    this.logger.log(`Health stats requested for device: ${deviceId}, hours: ${hoursToAnalyze}`);
    return await this.piHealthService.getHealthStats(deviceId, hoursToAnalyze);
  }

  /**
   * Get device health status
   */
  @Get('status/:deviceId')
  async getDeviceHealthStatus(@Param('deviceId') deviceId: string) {
    this.logger.log(`Device health status requested for device: ${deviceId}`);
    return await this.piHealthService.getDeviceHealthStatus(deviceId);
  }

  /**
   * Get critical alerts
   */
  @Get('alerts/critical')
  async getCriticalAlerts(
    @Query('deviceId') deviceId?: string,
    @Query('limit') limit?: number,
  ) {
    const limitNum = limit ? parseInt(limit.toString()) : 50;
    this.logger.log('Critical alerts requested', { deviceId, limit: limitNum });
    return await this.piHealthService.getCriticalAlerts(deviceId, limitNum);
  }

  /**
   * Manually trigger batch processing for a device (for testing)
   */
  @Post('batch/:deviceId/process')
  @HttpCode(HttpStatus.OK)
  async processBatch(@Param('deviceId') deviceId: string) {
    this.logger.log(`Manual batch processing requested for device: ${deviceId}`);
    await this.piHealthService.processBatch(deviceId);
    return {
      status: 'success',
      message: 'Pi health batch processing queued',
      deviceId,
      timestamp: new Date(),
    };
  }

  /**
   * Get ML model status and information
   */
  @Get('ml/status')
  async getMLStatus() {
    this.logger.log('Pi health ML model status requested');
    return await this.piHealthService.getMLStatus();
  }

  /**
   * Generate mock health reading for testing
   */
  @Post('mock/reading')
  @HttpCode(HttpStatus.CREATED)
  async generateMockReading(@Query('deviceId') deviceId?: string) {
    const targetDeviceId = deviceId || 'pi4-device-001';
    this.logger.log(`Mock health reading requested for device: ${targetDeviceId}`);
    return await this.piHealthService.generateMockHealthReading(targetDeviceId);
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'healthy',
      service: 'pi-health',
      timestamp: new Date(),
      version: '1.0.0',
      capabilities: [
        'CPU temperature monitoring',
        'CPU usage monitoring',
        'Memory usage monitoring',
        'Disk usage monitoring',
        'System load monitoring',
        'ML-based anomaly detection',
        'Alert system',
        'Health scoring'
      ],
    };
  }

  /**
   * Get system recommendations based on health data
   */
  @Get('recommendations/:deviceId')
  async getRecommendations(@Param('deviceId') deviceId: string) {
    this.logger.log(`Health recommendations requested for device: ${deviceId}`);
    
    const latestReading = await this.piHealthService.getLatestHealthReading(deviceId);
    if (!latestReading) {
      return {
        deviceId,
        recommendations: ['No health data available for recommendations'],
        timestamp: new Date(),
      };
    }

    const recommendations = [];

    // CPU Temperature recommendations
    if (latestReading.cpuTemperature > 80) {
      recommendations.push('CRITICAL: CPU temperature is dangerously high. Consider adding cooling or reducing load.');
    } else if (latestReading.cpuTemperature > 70) {
      recommendations.push('WARNING: CPU temperature is high. Check cooling system and reduce system load.');
    } else if (latestReading.cpuTemperature > 60) {
      recommendations.push('INFO: CPU temperature is elevated. Monitor for trends.');
    }

    // CPU Usage recommendations
    if (latestReading.cpuUsage > 90) {
      recommendations.push('CRITICAL: CPU usage is extremely high. Consider optimizing applications or upgrading hardware.');
    } else if (latestReading.cpuUsage > 80) {
      recommendations.push('WARNING: CPU usage is high. Review running processes and consider optimization.');
    } else if (latestReading.cpuUsage > 70) {
      recommendations.push('INFO: CPU usage is elevated. Monitor for performance impact.');
    }

    // Memory Usage recommendations
    if (latestReading.memoryUsage > 90) {
      recommendations.push('CRITICAL: Memory usage is critical. Consider adding RAM or optimizing memory usage.');
    } else if (latestReading.memoryUsage > 80) {
      recommendations.push('WARNING: Memory usage is high. Review memory-intensive processes.');
    } else if (latestReading.memoryUsage > 70) {
      recommendations.push('INFO: Memory usage is elevated. Monitor for memory leaks.');
    }

    // Disk Usage recommendations
    if (latestReading.diskUsage > 95) {
      recommendations.push('CRITICAL: Disk usage is critical. Free up space immediately.');
    } else if (latestReading.diskUsage > 90) {
      recommendations.push('WARNING: Disk usage is high. Consider cleaning up files or expanding storage.');
    } else if (latestReading.diskUsage > 80) {
      recommendations.push('INFO: Disk usage is elevated. Plan for storage expansion.');
    }

    // Load Average recommendations
    if (latestReading.loadAverage1m > 4) {
      recommendations.push('CRITICAL: System load is extremely high. Reduce system load immediately.');
    } else if (latestReading.loadAverage1m > 2) {
      recommendations.push('WARNING: System load is high. Review running processes.');
    }

    // Voltage recommendations
    if (latestReading.voltage && latestReading.voltage < 4.5) {
      recommendations.push('WARNING: Low voltage detected. Check power supply and consider using a higher-rated adapter.');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('System is operating within normal parameters. Continue monitoring.');
    }

    return {
      deviceId,
      recommendations,
      healthScore: this.calculateHealthScore(latestReading),
      timestamp: new Date(),
    };
  }

  /**
   * Calculate health score for recommendations
   */
  private calculateHealthScore(reading: any): number {
    let score = 100;

    if (reading.cpuTemperature > 80) score -= 30;
    else if (reading.cpuTemperature > 70) score -= 20;
    else if (reading.cpuTemperature > 60) score -= 10;

    if (reading.cpuUsage > 90) score -= 25;
    else if (reading.cpuUsage > 80) score -= 15;
    else if (reading.cpuUsage > 70) score -= 10;

    if (reading.memoryUsage > 90) score -= 25;
    else if (reading.memoryUsage > 80) score -= 15;
    else if (reading.memoryUsage > 70) score -= 10;

    if (reading.diskUsage > 95) score -= 20;
    else if (reading.diskUsage > 90) score -= 10;
    else if (reading.diskUsage > 80) score -= 5;

    return Math.max(0, score);
  }
} 