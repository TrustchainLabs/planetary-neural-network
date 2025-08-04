import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { GeoMedallionsController } from './geo-medallions.controller';
import { GeoMedallionsService } from './geo-medallions.service';
import { GeoMedallion, GeoMedallionSchema } from './entities/geo-medallion.entity';
import { Config, ConfigSchema } from '../config/entities/config.entity';
import { SmartNodeCommonModule } from '../smartnode-common.module';
import { GeoMedallionsConsumer } from './geo-medallions.consumer';

/**
 * @class GeoMedallionsModule
 * @description Module for managing geographic medallion NFTs
 * 
 * This module provides functionality for creating, managing, and purchasing
 * geographic medallions that represent hexagonal areas on a map. Each
 * medallion is an NFT that grants territorial access rights for IoT device
 * placement within the defined hexagonal area.
 * 
 * Features:
 * - Medallion creation and management
 * - Geographic querying with filtering
 * - NFT purchase and minting integration
 * - Integration with SmartNode for blockchain operations
 */
@Module({
  imports: [
    // MongoDB schema registration
    MongooseModule.forFeature([{
      name: GeoMedallion.name,
      schema: GeoMedallionSchema
    }, {
      name: Config.name,
      schema: ConfigSchema
    }]),
    // Bull queue for NFT minting jobs
    BullModule.registerQueue({
      name: 'geo-medallions',
    }),
    // Import SmartNode common services for blockchain operations
    SmartNodeCommonModule
  ],
  controllers: [GeoMedallionsController],
  providers: [GeoMedallionsService, GeoMedallionsConsumer],
  exports: [GeoMedallionsService]
})
export class GeoMedallionsModule {}