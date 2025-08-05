import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'devices', timestamps: true })
export class Device extends Document {
  @Prop({ required: true })
  deviceId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  ownerAddress: string;

  @Prop({ required: true })
  hexId: string;

  @Prop({ required: false })
  hederaAccount?: string;

  @Prop({ required: false })
  hcsTopic?: string;

  @Prop({ required: false })
  privateKey?: string;

  @Prop({ required: false })
  publicKey?: string;

  @Prop({ required: false })
  type?: string;

  @Prop({ required: false })
  accountId?: string;

  @Prop({ required: false, default: false })
  isActive?: boolean;

  @Prop({ required: false })
  lastSeen?: Date;

  @Prop({ 
    required: false,
    type: {
      coordinates: {
        type: [Number],
        required: true
      }
    }
  })
  location?: {
    coordinates: [number, number];
  };

  @Prop({ required: false })
  createdAt?: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
