import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum DeviceType {
  RASPBERRY_PI_DHT11 = 'RASPBERRY_PI_DHT11',
  LICOR_EDDY_COVARIANCE = 'LICOR_EDDY_COVARIANCE',
  LICOR_SOIL_FLUX = 'LICOR_SOIL_FLUX',
  LICOR_TRACE_GAS = 'LICOR_TRACE_GAS',
  LICOR_SMART_FLUX = 'LICOR_SMART_FLUX'
}

@Schema({ collection: 'devices', timestamps: true })
export class Device extends Document {
  @Prop({ required: true, unique: true })
  deviceId: string;

  @Prop({ required: true })
  name: string;

  // Ownership model - Licor or legacy user-owned
  @Prop({ required: true, default: 'licor' })
  owner: string;

  // Backward compatibility for user-owned devices
  @Prop({ required: false })
  ownerAddress?: string;

  // Device type
  @Prop({ required: true, enum: DeviceType, default: DeviceType.RASPBERRY_PI_DHT11 })
  deviceType: DeviceType;

  // Licor API integration
  @Prop({ required: false })
  licorApiId?: string;

  // Partnership configuration (for Licor devices)
  @Prop({ required: false, default: 100 })
  totalShares?: number;

  @Prop({ required: false, default: 0 })
  soldShares?: number;

  @Prop({ required: false, default: 100 })
  availableShares?: number;

  @Prop({ required: false, default: 10 })
  pricePerShare?: number;  // HBAR per share

  // Location
  @Prop({ required: true })
  hexId: string;

  @Prop({ 
    type: String,
    enum: ['Point'],
    default: 'Point'
  })
  locationType: string;

  @Prop({ 
    type: [Number],
    required: true,
    index: '2dsphere'
  })
  coordinates: number[];  // [longitude, latitude]

  // Virtual getter for GeoJSON format
  get location() {
    return {
      type: this.locationType || 'Point',
      coordinates: this.coordinates
    };
  }

  // Status
  @Prop({ required: true, default: 'active' })
  status: string;  // active/inactive/maintenance

  // Legacy Hedera fields (for user-owned devices)
  @Prop({ required: false })
  hederaAccount?: string;

  @Prop({ required: false })
  hcsTopic?: string;

  @Prop({ required: false })
  privateKey?: string;

  @Prop({ required: false })
  publicKey?: string;

  @Prop({ required: false })
  accountId?: string;

  @Prop({ required: false, default: false })
  isActive?: boolean;

  @Prop({ required: false })
  lastSeen?: Date;

  // Backward compatibility
  @Prop({ required: false })
  type?: string;

  // Licor-specific configuration
  @Prop({ type: Object, required: false })
  licorConfig?: {
    apiDeviceId?: string;
    capabilities?: string[];
    pollingInterval?: number;
    lastSyncAt?: Date;
  };

  // Extended metadata
  @Prop({ type: Object, required: false })
  metadata?: {
    description?: string;
    instrumentModel?: string;
    installationDate?: Date;
    calibrationDate?: Date;
    imageUrl?: string;
  };

  @Prop({ required: false })
  createdAt?: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
