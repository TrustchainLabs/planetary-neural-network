/**
 * @module SmartNodeCommonModule
 * @description Module for shared SmartNode operations
 * 
 * This module provides the SmartNodeCommonService which contains common
 * functionality for SmartNode operations used across multiple modules.
 * It exports the service so other modules can import and use it.
 */
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmartNodeCommonService } from './smartnode-common.service';
import { SmartLedgersService } from '@hsuite/smart-ledgers';
import { IClient } from '@hsuite/client-types';

/**
 * @class SmartNodeCommonModule
 * @description Module for shared SmartNode operations
 * 
 * This module provides centralized SmartNode functionality that can be
 * imported by other modules to avoid code duplication.
 */
@Module({
  providers: [
    SmartNodeCommonService,
    {
      provide: SmartLedgersService,
      useFactory: (configService: ConfigService) => {
        const clientConfig = configService.getOrThrow<IClient.IOptions>('client');
        return new SmartLedgersService({ ledgers: clientConfig.ledgers });
      },
      inject: [ConfigService],
    },
  ],
  exports: [SmartNodeCommonService],
})
export class SmartNodeCommonModule {} 