import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { BullModule } from '@nestjs/bull';
import { DevicesConsumer } from './devices.consumer';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from './entities/device.entity';
import { DevicePartnership, DevicePartnershipSchema } from './entities/device-partnership.entity';
import { DeviceModelService } from './devices.model.service';
import { DevicePartnershipService } from './device-partnership.service';
import { DevicePartnershipController } from './device-partnership.controller';
import { SmartLedgersModule } from '../../shared/modules/smart-ledgers.module';
import { DeviceControlGateway } from '../../sockets/device-control.gateway';
import { SmartNodeCommonModule } from '../smartnode-common.module';
import { GeoMedallionsModule } from '../geo-medallions/geo-medallions.module';
import { ConfigsModule } from '../config/config.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Device.name,
        schema: DeviceSchema
      },
      {
        name: DevicePartnership.name,
        schema: DevicePartnershipSchema
      }
    ]),
    BullModule.registerQueue({
      name: 'device',
    }),
    SmartLedgersModule,
    SmartNodeCommonModule,
    GeoMedallionsModule,
    ConfigsModule,
  ],
  controllers: [
    DevicesController,
    DevicePartnershipController
  ],
  providers: [
    DevicesService,
    DeviceModelService,
    DevicePartnershipService,
    DevicesConsumer,
    DeviceControlGateway,
  ],
  exports: [
    DevicesService,
    DevicePartnershipService
  ]
})
export class DevicesModule {} 