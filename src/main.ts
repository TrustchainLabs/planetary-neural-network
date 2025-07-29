import 'reflect-metadata';
/**
 * @module main
 * @description Application bootstrap and configuration module
 * 
 * This is the entry point of the DAO application, responsible for:
 * - Bootstrapping the NestJS application
 * - Configuring middleware (security, parsing, etc.)
 * - Setting up Swagger documentation
 * - Handling application clustering
 * - Starting the HTTP server
 * 
 * The module supports running the application in clustered mode for improved
 * performance and reliability across multiple CPU cores.
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
import { SmartAppModule } from './smart-app.module';
import express from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * @function bootstrap
 * @description Bootstraps the NestJS application
 * 
 * This function is responsible for creating and configuring the NestJS application.
 * It sets up middleware for security, parsing, and performance, configures Swagger
 * documentation, and starts the HTTP server.
 * 
 * The function performs the following:
 * - Creates a NestJS application instance
 * - Configures rate limiting to prevent DDoS attacks
 * - Sets up body parsing middleware
 * - Enables CORS for cross-origin requests
 * - Configures security middleware (Helmet)
 * - Sets up API documentation with Swagger
 * - Starts the HTTP server
 * 
 * @returns {Promise<any>} The configured NestJS application instance
 */
export async function bootstrap() {
  // creating app instance...
  const app = await NestFactory.create(SmartAppModule.register());

  // using custom throttler guard, to avoid DDOS attacks on /api and /public routes...
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

  // enabling body parser...
  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // enabling cors...
  app.enableCors({credentials: true, origin: true});
  // making use of CSRF Protection...
  app.use(cookieParser());

  // csurf seems not to be working when using passport/redis/jwt...
  // app.use(csurf({ cookie: true }));

  // making use of Helmet...
  app.use(helmet({
    crossOriginResourcePolicy: false
  }));

  // Starts listening for shutdown hooks
  app.enableShutdownHooks();

  // enabling compression server side...
  app.use(compression());

  /**
   * Swagger documentation configuration
   * Sets up the API documentation with detailed information about the application
   */
  const config = new DocumentBuilder()
  .setTitle('Hsuite - DAO')
  .setDescription(`Welcome to the DAO Swagger Open API.</br>`)
  .setVersion('2.0')
  .addTag('HSuite', 'Enhancing the Hashgraph Network', {description: 'HSuite Documentation', url: 'https://docs.hsuite.finance'})
  .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
 
  // start listening on the port...
  await app.listen(process.env.PORT || 3000, '0.0.0.0');

  // returning app instance...
  return app;
}

bootstrap();