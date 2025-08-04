import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * @interface ICoordinate
 * @description Geographic coordinate representation
 */
export interface ICoordinate {
  latitude: number;
  longitude: number;
}

/**
 * @interface IVertex
 * @description Hexagon vertex coordinate
 */
export interface IVertex extends ICoordinate {}

/**
 * @class GeoMedallion
 * @description MongoDB entity for geographic medallion hexagons
 * 
 * Represents a hexagonal geographic area that can be purchased as an NFT.
 * Each medallion grants territorial access rights for IoT device placement.
 */
@Schema({ collection: 'geo_medallions', timestamps: true })
export class GeoMedallion extends Document {
  @Prop({ required: true, unique: true })
  hexId: string;

  @Prop({ required: true, type: Object })
  center: ICoordinate;

  @Prop({ required: true, type: [Object] })
  vertices: IVertex[];

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, default: true })
  available: boolean;

  @Prop({ required: false })
  ownerAddress?: string;

  @Prop({ required: false })
  nftTokenId?: string;

  @Prop({ required: false })
  hederaTopicId?: string;

  @Prop({ required: false })
  purchaseTransactionId?: string;

  @Prop({ required: false })
  purchasedAt?: Date;

  @Prop({ required: false })
  mintTransactionId?: string;

  @Prop({ required: false })
  mintedAt?: Date;

  @Prop({ type: Object, required: false })
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };

  @Prop({ type: [Object], required: false, default: [] })
  devices?: Array<{
    deviceId: string;
    name: string;
    ownerAddress: string;
    createdAt: Date;
  }>;
}

export const GeoMedallionSchema = SchemaFactory.createForClass(GeoMedallion);