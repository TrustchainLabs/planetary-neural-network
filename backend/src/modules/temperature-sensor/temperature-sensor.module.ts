import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { TemperatureSensorController } from './temperature-sensor.controller';
import { DHT11SensorController } from './dht11-sensor.controller';
import { TemperatureSensorService } from './temperature-sensor.service';
import { DHT11SensorService } from './dht11-sensor.service';
import { TemperatureSensorModelService } from './temperature-sensor.model.service';
import { TemperatureSensorConsumer } from './temperature-sensor.consumer';
import { TemperatureMachineLearningService } from './temperature-ml.service';
import { TemperatureReading, TemperatureReadingSchema } from './entities/temperature-reading.entity';
import { TemperatureAnalysis, TemperatureAnalysisSchema } from './entities/temperature-analysis.entity';
import { DHT11Reading, DHT11ReadingSchema } from './entities/dht11-reading.entity';
import { SmartLedgersModule } from '../../shared/modules/smart-ledgers.module';

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
      name: 'temperature-processing',
    }),
    
    // Smart ledgers module for blockchain integration
    SmartLedgersModule,
  ],
  controllers: [TemperatureSensorController, DHT11SensorController],
  providers: [
    TemperatureSensorService,
    DHT11SensorService,
    TemperatureSensorModelService,
    TemperatureSensorConsumer,
    TemperatureMachineLearningService,
  ],
  exports: [
    TemperatureSensorService,
    DHT11SensorService,
    TemperatureSensorModelService,
    TemperatureMachineLearningService,
  ],
})
export class TemperatureSensorModule {} 