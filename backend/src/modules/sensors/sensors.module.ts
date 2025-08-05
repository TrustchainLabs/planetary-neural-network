import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SensorsController } from './sensors.controller';
import { DataCollectionService } from './data-collection.service';
import { TemperatureReading, TemperatureReadingSchema } from './entities/temperature-reading.entity';
import { TemperatureAnalysis, TemperatureAnalysisSchema } from './entities/temperature-analysis.entity';
import { Device, DeviceSchema } from '../devices/entities/device.entity';
import { Config, ConfigSchema } from '../config/entities/config.entity';
import { SmartNodeCommonModule } from '../smartnode-common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { 
        name: TemperatureReading.name, 
        schema: TemperatureReadingSchema 
      },
      { 
        name: TemperatureAnalysis.name, 
        schema: TemperatureAnalysisSchema 
      },
      { 
        name: Device.name, 
        schema: DeviceSchema 
      },
      { 
        name: Config.name, 
        schema: ConfigSchema 
      }
    ]),
    ScheduleModule.forRoot(),
    SmartNodeCommonModule
  ],
  controllers: [SensorsController],
  providers: [
    DataCollectionService
  ],
  exports: [
    DataCollectionService,
    MongooseModule
  ]
})
export class SensorsModule {}