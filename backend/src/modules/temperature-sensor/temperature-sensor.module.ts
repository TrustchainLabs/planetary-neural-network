import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { TemperatureSensorController } from './temperature-sensor.controller';
import { TemperatureSensorService } from './temperature-sensor.service';
import { TemperatureSensorModelService } from './temperature-sensor.model.service';
import { TemperatureSensorConsumer } from './temperature-sensor.consumer';
import { TemperatureMachineLearningService } from './temperature-ml.service';
import { TemperatureReading, TemperatureReadingSchema } from './entities/temperature-reading.entity';
import { TemperatureAnalysis, TemperatureAnalysisSchema } from './entities/temperature-analysis.entity';
import { DHT11Reading, DHT11ReadingSchema } from './entities/dht11-reading.entity';
import { SmartLedgersModule } from '../../shared/modules/smart-ledgers.module';
import { TemperatureAnalysisConsumer } from './temperature-analysis.consumer';

@Module({
  imports: [
    // MongoDB setup for temperature readings, analyses and DHT11 readings
    MongooseModule.forFeature([
      {
        name: TemperatureReading.name,
        schema: TemperatureReadingSchema,
      },
      {
        name: TemperatureAnalysis.name,
        schema: TemperatureAnalysisSchema,
      },
      {
        name: DHT11Reading.name,
        schema: DHT11ReadingSchema,
      },
    ]),
    
    // Bull queue for async processing
    BullModule.registerQueue({
      name: 'temperature-analysis',
    }),
    
    // Smart ledgers module for blockchain integration
    SmartLedgersModule,
  ],
  controllers: [TemperatureSensorController],
  providers: [
    TemperatureSensorService,
    TemperatureSensorModelService,
    TemperatureSensorConsumer,
    TemperatureMachineLearningService,
    TemperatureAnalysisConsumer,
  ],
  exports: [
    TemperatureSensorService,
    TemperatureSensorModelService,
    TemperatureMachineLearningService,
  ],
})
export class TemperatureSensorModule {} 