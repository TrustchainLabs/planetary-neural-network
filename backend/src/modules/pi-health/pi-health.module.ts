import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { PiHealthController } from './pi-health.controller';
import { PiHealthService } from './pi-health.service';
import { PiHealthMLService } from './pi-health-ml.service';
import { PiHealth, PiHealthSchema } from './entities/pi-health.entity';

@Module({
  imports: [
    // MongoDB setup for Pi health readings
    MongooseModule.forFeature([
      {
        name: PiHealth.name,
        schema: PiHealthSchema,
      },
    ]),
    
    // Bull queue for async processing
    BullModule.registerQueue({
      name: 'pi-health-processing',
    }),
  ],
  controllers: [PiHealthController],
  providers: [
    PiHealthService,
    PiHealthMLService,
  ],
  exports: [
    PiHealthService,
    PiHealthMLService,
  ],
})
export class PiHealthModule {} 