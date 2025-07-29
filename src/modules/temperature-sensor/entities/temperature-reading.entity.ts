import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Unit } from '../../../shared/enums';

@Schema({ collection: 'temperature_readings', timestamps: true })
export class TemperatureReading extends Document {
  @Prop({ required: true })
  deviceId: string;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true, enum: [Unit.CELCIUS], default: Unit.CELCIUS })
  unit: Unit.CELCIUS;

  @Prop({ required: true, default: Date.now })
  timestamp: Date;

  @Prop({ required: false })
  processed?: boolean;

  @Prop({ required: false })
  aiAnalysis?: string; // TODO: Will store AI analysis results

  @Prop({ required: false })
  chainTxHash?: string; // Hash of transaction sent to chain

  @Prop({ 
    required: false,
    type: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false }
    }
  })
  location?: {
    latitude: number;
    longitude: number;
  };
}

export const TemperatureReadingSchema = SchemaFactory.createForClass(TemperatureReading); 