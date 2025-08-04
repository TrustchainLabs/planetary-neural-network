import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'devices' })
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
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
