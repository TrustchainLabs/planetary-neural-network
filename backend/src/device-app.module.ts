/**
 * @module DeviceAppModule
 * @description Device-specific application module for Raspberry Pi IoT devices
 * 
 * This module serves as the entry point for device mode, specifically designed for 
 * Raspberry Pi devices with climate sensors. It excludes geo-medallion functionality
 * and focuses only on sensor data collection, processing, and submission.
 * 
 * Device mode includes:
 * - Temperature sensor monitoring
 * - Pi health monitoring  
 * - Local data processing with AI
 * - Blockchain data submission for rewards
 * - Device management
 * 
 * Excluded from device mode:
 * - Geo medallion purchasing/management
 * - Frontend static file serving
 * - Authentication (devices use private keys)
 */
import { DynamicModule, Module } from '@nestjs/common';
import { SmartAppController } from './smart-app.controller';
import { SmartAppService } from './smart-app.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-redis-yet';
import { RedisClientOptions } from 'redis';
import { SecurityThrottlerModule } from '@hsuite/throttler';
import { IIPFS, IpfsModule } from '@hsuite/ipfs';
import { SmartConfigModule, SmartConfigService } from '@hsuite/smart-config';
import { BullModule } from '@nestjs/bull';

// Import device-specific modules only
import { DevicesModule } from './modules/devices/devices.module';
import { ConfigsModule } from './modules/config/config.module';
import { SensorsModule } from './modules/sensors/sensors.module';
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

/**
 * @class DeviceAppModule
 * @description Core module for device (Raspberry Pi) mode
 * 
 * Configures only the modules needed for device operation:
 * - Sensor data collection and processing
 * - Device health monitoring
 * - Blockchain integration for rewards
 * - Background job processing for AI analysis
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
export class DeviceAppModule {

  /**
   * @method register
   * @description Factory method to register the DeviceAppModule with device-specific dependencies
   * 
   * Registers only the modules needed for device operation, excluding geo-medallions
   * and other production-only features.
   * 
   * @returns {DynamicModule} A configured module for device mode
   */
  static register(): DynamicModule {
    return {
      module: DeviceAppModule,
      imports: [
        // Import device-specific modules only
        DevicesModule,
        ConfigsModule,
        SensorsModule,
        PiHealthModule,
        
        // Configure Bull module for background jobs
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
        
        // Core infrastructure modules
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
        /**
         * Optional Modules Configuration
         * Note: Authentication is disabled for device mode as devices use private keys
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