import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { BullModule } from '@nestjs/bull';
import { DevicesConsumer } from './devices.consumer';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from './entities/device.entity';
import { DeviceModelService } from './devices.model.service';
import { SmartLedgersModule } from '../../shared/modules/smart-ledgers.module';
import { DeviceControlGateway } from '../../sockets/device-control.gateway';
import { SmartNodeCommonModule } from '../smartnode-common.module';
import { GeoMedallionsModule } from '../geo-medallions/geo-medallions.module';
import { ConfigsModule } from '../config/config.module';


@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Device.name,
      schema: DeviceSchema
    }]),
    BullModule.registerQueue({
      name: 'device',
    }),
    SmartLedgersModule,
    SmartNodeCommonModule,
    GeoMedallionsModule,
    ConfigsModule,
  ],
  controllers: [DevicesController],
  providers: [
    DevicesService,
    DeviceModelService,
    DevicesConsumer,
    DeviceControlGateway,
  ],
  exports: [DevicesService]
})
export class DevicesModule {} 