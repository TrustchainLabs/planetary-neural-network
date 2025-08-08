import 'reflect-metadata';
/**
 * @module main-production
 * @description Production mode bootstrap for the master smart app
 * 
 * This is the entry point for production mode, designed for running the master
 * smart app that handles infrastructure management. It provides:
 * - Full web server with frontend serving
 * - Geo medallion purchasing and management
 * - Device registration and management
 * - User authentication and wallet connection
 * - Complete API documentation
 * 
 * Production mode excludes:
 * - Physical sensor operations
 * - Direct device data collection
 */
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@hsuite/nestjs-swagger';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { CustomThrottlerGuard } from '@hsuite/throttler';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { SmartAppService } from './smart-app.service';
import { ProductionAppModule } from './production-app.module';
import express from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * @function bootstrap
 * @description Bootstraps the NestJS application in production mode
 * 
 * This function creates a full-featured web server for production deployment.
 * It includes all middleware for security, authentication, documentation,
 * and frontend serving.
 * 
 * @returns {Promise<any>} The configured NestJS application instance
 */
export async function bootstrap() {
  console.log('🌐 Starting Climate DAO Production Mode...');
  
  // Create production app instance
  const app = await NestFactory.create(ProductionAppModule.register());

  // Full throttling protection for production
  const throttlerGuard = app.get(CustomThrottlerGuard);
  app.use(async function (req, res, next) {
    let executionContext = new ExecutionContextHost(
      [req, res], app.get(SmartAppService), app.get(SmartAppService)
    );

    if(req.originalUrl.includes('/api') || req.originalUrl.includes('/public')) {
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

  // Full middleware stack for production
  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Enable CORS for frontend
  app.enableCors({credentials: true, origin: true});
  
  // Cookie parsing for session management
  app.use(cookieParser());

  // Full security headers for production
  app.use(helmet({
    crossOriginResourcePolicy: false
  }));

  // Enable compression
  app.use(compression());

  // Starts listening for shutdown hooks
  app.enableShutdownHooks();

  /**
   * Swagger API documentation for production
   * Provides complete API documentation for frontend integration
   */
  const config = new DocumentBuilder()
    .setTitle('Climate DAO - Production API')
    .setDescription(`
      <h3>Climate DAO Master Smart App API</h3>
      <p>This API provides endpoints for:</p>
      <ul>
        <li>🏆 Geo Medallion purchasing and management</li>
        <li>📱 Device registration and management</li>
        <li>👤 User authentication and profiles</li>
        <li>💰 Reward token management</li>
        <li>📊 Analytics and reporting</li>
      </ul>
      <p><strong>Note:</strong> This is the production API. Device-specific sensor endpoints are not available here.</p>
    `)
    .setVersion('2.0')
    .addTag('Production', 'Master Smart App Endpoints')
    .addTag('Geo Medallions', 'NFT Hexagonal Area Management')
    .addTag('Devices', 'IoT Device Registration')
    .addTag('Rewards', 'Token Reward System')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Start listening on configured port
  const port = process.env.PORT || 8888;
  await app.listen(port, '0.0.0.0');

  console.log(`🌍 Production mode running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log('🏆 Geo medallion operations active');
  console.log('👥 User authentication active');
  console.log('📱 Device management active');

  return app;
}

// Only bootstrap if this file is run directly
if (require.main === module) {
  bootstrap().catch(console.error);
}