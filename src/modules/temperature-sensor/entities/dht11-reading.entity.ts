import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Unit } from '../../../shared/enums';

export type DHT11ReadingDocument = DHT11Reading & Document;

@Schema({ timestamps: true })
export class DHT11Reading {
  @Prop({ required: true, index: true })
  deviceId: string;

  @Prop({ required: true, type: Number, min: -100, max: 100 })
  temperature: number;

  @Prop({ required: true, type: Number, min: 0, max: 100 })
  humidity: number;

  @Prop({ 
    type: String, 
    enum: Unit, 
    default: Unit.CELCIUS 
  })
  temperatureUnit: Unit;

  @Prop({ default: '%' })
  humidityUnit: string;

  @Prop({ type: Date, default: Date.now, index: true })
  timestamp: Date;

  @Prop({ type: Number, required: false })
  latitude?: number;

  @Prop({ type: Number, required: false })
  longitude?: number;

  @Prop({ type: Number, required: false })
  gpioPin?: number;

  @Prop({ default: 'DHT11' })
  sensorType: string;

  @Prop({ default: false })
  processed: boolean;
}

export const DHT11ReadingSchema = SchemaFactory.createForClass(DHT11Reading); 