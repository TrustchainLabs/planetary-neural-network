import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PiHealthDocument = PiHealth & Document;

@Schema({ timestamps: true })
export class PiHealth {
  @Prop({ required: true, index: true })
  deviceId: string;

  @Prop({ required: true, type: Number, min: -100, max: 100 })
  cpuTemperature: number; // CPU temperature in °C

  @Prop({ required: true, type: Number, min: 0, max: 100 })
  cpuUsage: number; // CPU usage percentage

  @Prop({ required: true, type: Number, min: 0, max: 100 })
  memoryUsage: number; // Memory usage percentage

  @Prop({ required: true, type: Number, min: 0, max: 100 })
  diskUsage: number; // Disk usage percentage

  @Prop({ type: Number, required: false, min: 0 })
  networkUpload?: number; // Network upload in MB/s

  @Prop({ type: Number, required: false, min: 0 })
  networkDownload?: number; // Network download in MB/s

  @Prop({ type: Number, required: false, min: 0 })
  uptime?: number; // System uptime in seconds

  @Prop({ type: Number, required: false, min: 0 })
  loadAverage1m?: number; // 1-minute load average

  @Prop({ type: Number, required: false, min: 0 })
  loadAverage5m?: number; // 5-minute load average

  @Prop({ type: Number, required: false, min: 0 })
  loadAverage15m?: number; // 15-minute load average

  @Prop({ type: Number, required: false, min: 0 })
  voltage?: number; // CPU voltage in V

  @Prop({ type: Number, required: false, min: 0 })
  frequency?: number; // CPU frequency in MHz

  @Prop({ type: Date, default: Date.now, index: true })
  timestamp: Date;

  @Prop({ type: Number, required: false })
  latitude?: number;

  @Prop({ type: Number, required: false })
  longitude?: number;

  @Prop({ 
    type: String, 
    enum: ['normal', 'warning', 'critical', 'emergency'],
    default: 'normal'
  })
  alertLevel: string;

  @Prop({ type: String, required: false })
  alertMessage?: string;

  @Prop({ default: false })
  processed: boolean;

  @Prop({ type: Object, required: false })
  mlAnalysis?: {
    riskScore: number;
    anomalyDetected: boolean;
    prediction: string;
    confidence: number;
  };
}

export const PiHealthSchema = SchemaFactory.createForClass(PiHealth); 