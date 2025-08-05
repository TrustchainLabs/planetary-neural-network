import 'reflect-metadata';
/**
 * @module main-device
 * @description Device mode bootstrap for Raspberry Pi IoT devices
 * 
 * This is the entry point for device mode, specifically designed for Raspberry Pi
 * devices with climate sensors. It runs a minimal server focused on:
 * - Sensor data collection and processing
 * - Local AI analysis of climate data
 * - Blockchain submission for rewards
 * - Device health monitoring
 * 
 * Device mode excludes:
 * - Frontend serving (no UI needed)
 * - Geo medallion operations
 * - User authentication (uses device private keys)
 * - Swagger documentation
 */
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import compression from 'compression';
import { CustomThrottlerGuard } from '@hsuite/throttler';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { SmartAppService } from './smart-app.service';
import { DeviceAppModule } from './device-app.module';
import express from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * @function bootstrap
 * @description Bootstraps the NestJS application in device mode
 * 
 * This function creates a minimal server instance for device operation.
 * It excludes frontend serving and authentication since devices operate
 * autonomously using private keys.
 * 
 * @returns {Promise<any>} The configured NestJS application instance
 */
export async function bootstrap() {
  console.log('🚀 Starting Climate DAO Device Mode...');
  
  // Create device app instance
  const app = await NestFactory.create(DeviceAppModule.register());

  // Basic throttling for device API endpoints
  const throttlerGuard = app.get(CustomThrottlerGuard);
  app.use(async function (req, res, next) {
    let executionContext = new ExecutionContextHost(
      [req, res], app.get(SmartAppService), app.get(SmartAppService)
    );

    if(req.originalUrl.includes('/api')) {
      try {
        await throttlerGuard.handleCustomRequest(
          executionContext, 
          app.get(ConfigService).get('throttler.settings.limit'),
          app.get(ConfigService).get('throttler.settings.ttl')
        );
        next();
      } catch(error) {
        res.status(429).json({
          statusCode: 429,
          message: 'Too Many Requests',
        });
      }
    } else {
      next();
    }
  });

  // Enable basic middleware
  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  
  // Basic security for device endpoints
  app.use(helmet({
    crossOriginResourcePolicy: false
  }));

  // Enable compression
  app.use(compression());

  // Starts listening for shutdown hooks
  app.enableShutdownHooks();

  // Start listening on configured port
  const port = process.env.DEVICE_PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`📡 Device mode running on port ${port}`);
  console.log('🌡️ Temperature sensors active');
  console.log('💚 Pi health monitoring active');
  console.log('🔗 Blockchain integration ready');

  return app;
}

// Only bootstrap if this file is run directly
if (require.main === module) {
  bootstrap().catch(console.error);
}