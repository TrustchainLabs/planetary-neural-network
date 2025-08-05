import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { PiHealthController } from './pi-health.controller';
import { PiHealthService } from './pi-health.service';
import { PiHealthMLService } from './pi-health-ml.service';
import { PiHealth, PiHealthSchema } from './entities/pi-health.entity';
import { PiHealthAnalysisConsumer } from './consumers/pi-health-analysis.consumer';

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
      name: 'pi-health-analysis',
    }),
  ],
  controllers: [PiHealthController],
  providers: [
    PiHealthService,
    PiHealthMLService,
    PiHealthAnalysisConsumer,
  ],
  exports: [
    PiHealthService,
    PiHealthMLService,
  ],
})
export class PiHealthModule {} 