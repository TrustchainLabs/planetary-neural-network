import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Unit } from '../../../shared/enums';

@Schema({ collection: 'temperature_analyses', timestamps: true })
export class TemperatureAnalysis extends Document {
  @Prop({ required: true })
  deviceId: string;

  @Prop({ required: true })
  batchId: string; // Unique identifier for this batch analysis

  @Prop({ required: true })
  readingCount: number; // Number of readings analyzed

  @Prop({ 
    required: true,
    type: {
      start: { type: String, required: true },
      end: { type: String, required: true }
    }
  })
  timeRange: {
    start: string;
    end: string;
  };

  @Prop({ required: true })
  averageTemperature: number;

  @Prop({ required: true, enum: [Unit.CELCIUS], default: Unit.CELCIUS })
  unit: Unit.CELCIUS;

  @Prop({ required: true })
  minimumTemperature: number;

  @Prop({ required: true })
  maximumTemperature: number;

  @Prop({ 
    required: false, 
    default: [],
    type: [{
      value: { type: Number, required: true },
      timestamp: { type: String, required: true },
      deviation: { type: Number, required: true }
    }]
  })
  outliers: Array<{
    value: number;
    timestamp: string;
    deviation: number; // How many standard deviations from mean
  }>;

  @Prop({ 
    required: false,
    type: [{
      predictedValue: { type: Number, required: true },
      confidence: { type: Number, required: true },
      anomalyScore: { type: Number, required: true },
      isAnomaly: { type: Boolean, required: true },
      trend: { type: String, enum: ['rising', 'falling', 'stable'], required: true }
    }]
  })
  predictions?: Array<{
    predictedValue: number;
    confidence: number;
    anomalyScore: number;
    isAnomaly: boolean;
    trend: 'rising' | 'falling' | 'stable';
  }>;

  @Prop({ required: true })
  severity: 'normal' | 'low' | 'medium' | 'high' | 'critical';

  @Prop({ required: false })
  warnings?: string[];

  @Prop({ required: false })
  aiInsights?: string; // Full AI analysis text

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

  @Prop({ required: false })
  chainTxHash?: string; // Hash of transaction sent to chain

  @Prop({ required: true, default: new Date().toISOString() })
  analysisTimestamp: string;

  @Prop({ 
    required: false,
    type: {
      standardDeviation: { type: Number, required: false },
      variance: { type: Number, required: false },
      trendSlope: { type: Number, required: false },
      stabilityScore: { type: Number, required: false },
      mlConfidenceScore: { type: Number, required: false },
      modelTrained: { type: Boolean, required: false }
    }
  })
  statisticalData?: {
    standardDeviation: number;
    variance: number;
    trendSlope: number; // Rate of change per hour
    stabilityScore: number; // 0-1, how stable the readings are
    mlConfidenceScore?: number; // ML model confidence score
    modelTrained?: boolean; // Whether ML model is trained
  };
}

export const TemperatureAnalysisSchema = SchemaFactory.createForClass(TemperatureAnalysis); 