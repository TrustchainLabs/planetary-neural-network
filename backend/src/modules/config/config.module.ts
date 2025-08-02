/**
 * @module configs
 * @description Configs module for database schema management
 * 
 * This module handles database configs and provides CLI commands for managing them.
 * It registers the config commands with the NestJS dependency injection system.
 */

import { Module } from '@nestjs/common';
import { ConfigCommand } from './cli/config-cli';
import { MongooseModule } from '@nestjs/mongoose';
import { Config, ConfigSchema } from './entities/config.entity';
import { SmartLedgersModule } from '../../shared/modules/smart-ledgers.module';

/**
 * @class ConfigsModule
 * @description Module for database configs
 * 
 * Registers config-related components and commands:
 * - ConfigCommand: CLI command for running configs
 * 
 * Imports:
 * - ClientModule: Provides ClientService for authenticated operations
 *   (The ClientModule is already configured at the application level through SmartNodeSdkModule)
 */
@Module({
  // Import ClientModule to make ClientService available for injection
  // No need to call forRootAsync here since it's configured at the app level
  imports: [
    MongooseModule.forFeature([{
      name: Config.name, 
      schema: ConfigSchema 
    }]),
    SmartLedgersModule,
  ],
  providers: [ConfigCommand],
  exports: [ConfigCommand],
})
export class ConfigsModule {} 