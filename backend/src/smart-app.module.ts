/**
 * @module SmartAppModule
 * @description Main application module for the DAO management system
 * 
 * This module serves as the entry point for the DAO application, integrating all essential 
 * features for decentralized autonomous organization management. It combines core functionality 
 * for managing DAOs, proposals, and voting mechanisms with essential infrastructure services.
 * 
 * The module provides:
 * - Database connectivity through MongoDB
 * - Caching through Redis
 * - Event handling through EventEmitter
 * - Background job processing through Bull
 * - Static file serving
 * - Scheduling capabilities
 * - Integration with authentication systems
 * - IPFS storage capabilities
 * - Rate limiting through throttler
 * 
 * @usageNotes
 * To use this module, import it with SmartAppModule.register() to ensure all dynamic modules
 * are properly initialized with their dependencies.
 * 
 * @example
 * ```typescript
 * import { SmartAppModule } from './smart-app.module';
 * 
 * async function bootstrap() {
 *   const app = await NestFactory.create(SmartAppModule.register());
 *   await app.listen(3000);
 * }
 * bootstrap();
 * ```
 */
import { DynamicModule, Module } from '@nestjs/common';
import { SmartAppController } from './smart-app.controller';
import { SmartAppService } from './smart-app.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-redis-yet';
import { RedisClientOptions } from 'redis';
import { AuthModule } from '@hsuite/auth';
import { IAuth } from '@hsuite/auth-types';
import { SecurityThrottlerModule } from '@hsuite/throttler';
import { IIPFS, IpfsModule } from '@hsuite/ipfs';
import { SmartConfigModule, SmartConfigService } from '@hsuite/smart-config';
import { BullModule } from '@nestjs/bull';

// Import our new modules
import { DevicesModule } from './modules/devices/devices.module';
import { ConfigsModule } from './modules/config/config.module';
import { GeoMedallionsModule } from './modules/geo-medallions/geo-medallions.module';
import { TemperatureSensorModule } from './modules/temperature-sensor/temperature-sensor.module';
import { PiHealthModule } from './modules/pi-health/pi-health.module';
import { SmartLedgersModule } from './shared/modules/smart-ledgers.module';

import authentication from '../config/modules/authentication';
import client from '../config/modules/client';
import smartConfig from '../config/modules/smart-config';
import mongoDb from '../config/settings/mongo-db';
import throttler from '../config/modules/throttler';
import { IThrottler } from '@hsuite/throttler-types';
import redis from '../config/settings/redis';
import { SmartNodeSdkModule } from '@hsuite/smartnode-sdk';
import { IClient } from '@hsuite/client-types';
import { ISmartNetwork } from '@hsuite/smart-network-types';
import { Config } from 'cache-manager';
import { ClientModule, ClientService } from '@hsuite/client';
import ipfs from '../config/modules/ipfs';
import subscription from '../config/modules/subscription';
import { SubscriptionsModule } from '@hsuite/subscriptions';
import { ISubscription } from '@hsuite/subscriptions-types';
import { SmartLedgersService } from '@hsuite/smart-ledgers';

/**
 * @class SmartAppModule
 * @description Core module for the DAO application
 * 
 * The SmartAppModule integrates all necessary components for the DAO application.
 * It configures core infrastructure like database connections, caching, event handling,
 * and integrates feature modules for DAOs, proposals, and voting.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.smart_app.env'],
      load: [
        authentication,
        client,
        mongoDb,
        throttler,
        redis,
        smartConfig,
        ipfs,
        subscription
      ]
    }),
    ScheduleModule.forRoot(),
    // Redis cache configuration
    CacheModule.registerAsync<RedisClientOptions & Config>({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.getOrThrow<RedisClientOptions & Config>('redis');
        return {
          store: await redisStore(redisConfig as any),
        };
      }
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.getOrThrow<{url: string}>('mongoDb').url
      })
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: true,
      removeListener: true,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '../public'),
      serveRoot: '/public/',
      exclude: ["/api*"],
    })
  ],
  controllers: [
    SmartAppController
  ],
  providers: [
    SmartAppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    }
  ]
})
export class SmartAppModule {

  /**
   * @method register
   * @description Factory method to register the SmartAppModule with all its dynamic dependencies
   * 
   * This method registers all required modules and their configurations dynamically,
   * including conditional modules that are only loaded if enabled in configuration.
   * 
   * @returns {DynamicModule} A configured module with all dependencies resolved
   */
  static register(): DynamicModule {
    return {
      module: SmartAppModule,
      imports: [
        // Import our new modules
        DevicesModule,
        ConfigsModule,
        GeoMedallionsModule,
        TemperatureSensorModule,
        PiHealthModule,
        
        // Configure Bull module for queues
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            const redisConfig = configService.get('redis');
            return {
              redis: {
                host: redisConfig?.socket?.host || 'localhost',
                port: redisConfig?.socket?.port || 6379,
                password: redisConfig?.password || undefined,
                username: redisConfig?.username || undefined,
              },
              defaultJobOptions: {
                attempts: 5,
                backoff: {
                  type: 'exponential',
                  delay: 1000
                },
                removeOnComplete: true,
                removeOnFail: false
              }
            };
          }
        }),
        
        // Smart Node - Core Modules
        IpfsModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => ({
            ...configService.getOrThrow<IIPFS.IOptions>('ipfs')
          })
        }),
        SecurityThrottlerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => ({
            ...configService.getOrThrow<IThrottler.IOptions>('throttler')
          })
        }),
        SmartConfigModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => ({
            ...configService.getOrThrow<ISmartNetwork.INetwork.IConfig.IOptions>('smartConfig')
          })
        }),
        SmartNodeSdkModule.forRootAsync({
          imports: [ConfigModule, SmartConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => ({
            client: configService.getOrThrow<IClient.IOptions>('client')
          })
        }),
        ...(
          authentication().enabled ? 
          [AuthModule.forRootAsync({
            imports: [ConfigModule, ClientModule, SmartLedgersModule],
            inject: [ConfigService, ClientService],
            useFactory: async (configService: ConfigService, clientService: ClientService) => ({
              ...configService.getOrThrow<IAuth.IConfiguration.IAuthentication>('authentication')
            }),
            config: {
              passport: authentication().commonOptions.passport,
              module: 'web3',
              options: {
                  confirmation_required: authentication().web2Options.confirmation_required,
                  admin_only: authentication().web2Options.admin_only,
                  enable_2fa: authentication().web2Options.twilioOptions.enabled
              }                
            }
          })] : []
        ),
        /**
         * Optional Modules Configuration
         * @description Configures subscription services if enabled
         */
        ...(
          subscription().enabled ? 
          [SubscriptionsModule.forRootAsync({
            imports: [ConfigModule, SmartConfigModule, SmartLedgersModule],
            inject: [ConfigService, SmartConfigService],
            jwt: authentication().commonOptions.jwt,
            enableIssuer: subscription().issuer.enabled,
            enableTokenGate: subscription().tokenGate.enabled,
            useFactory: async (
              configService: ConfigService,
              smartConfigService: SmartConfigService
            ) => ({
              subscription: {
                ...configService.getOrThrow<ISubscription.IConfig.IOptions>('subscription'),
                utilities: []
              },
              bull: {
                redis: configService.getOrThrow<ISubscription.IConfig.IRedis>('subscription.issuer.options.redis'),
                defaultJobOptions: {
                  attempts: 5,
                  backoff: {
                    type: 'exponential',
                    delay: 1000
                  },
                  removeOnComplete: true,
                  removeOnFail: false
                }
              }
            })
          })] : []
        ),        
      ],
      providers: []
    };
  }
}
