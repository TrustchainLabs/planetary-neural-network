/**
 * @module ConfigEntity
 * @description Data model for mutable Configuration settings
 * 
 * This module defines the data model for mutable configuration settings for the DAO engine.
 * It stores only configuration that can change after initial setup, as immutable configuration
 * is stored in the Hedera topic validator. It uses Mongoose for object-document mapping and
 * NestJS schema decorators for validation.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { Document } from 'mongoose';

/**
 * @type ConfigDocument
 * @description Type definition for Config document in MongoDB
 * 
 * Combines the Config class with Mongoose Document capabilities
 */
export type ConfigDocument = Config & Document;

/**
 * @class Config
 * @description Represents mutable configuration settings entity for the DAO engine
 * 
 * The Config class defines the structure and validation rules for global mutable configuration
 * settings of the DAO engine. This specifically excludes settings already defined in the
 * Hedera topic validator, which are immutable after initialization.
 */
@Schema({
  collection: 'smart_app_medallions_configs',
  timestamps: true,
  validateBeforeSave: true
})
export class Config {
  /**
   * @property geo_medallions_config
   * @description Configuration settings for geo medallions (NFT collection)
   * 
   * Contains the collection ID and metadata information for the geo medallions NFT collection.
   * This includes the token collection ID and IPFS metadata CID.
   * 
   * @example { collection_id: '0.0.123456', nft_metadata_cid: 'ipfs://...' }
   */
  @Prop({ 
    required: true, 
    type: {
      collection_id: { type: String, required: true },
      nft_metadata_cid: { type: String, required: true }
    }
  })
  @ApiProperty({
    type: Object,
    description: 'Configuration settings for geo medallions NFT collection',
    example: {
      collection_id: '0.0.123456',
      nft_metadata_cid: 'ipfs://bafybeicfppolkroemgqbwwiko45cdfjl5wsinuzw5m34ysxgayrzgb35i4/medallion_cid.json'
    }
  })
  @IsObject()
  @IsNotEmpty()
  geo_medallions_config: {
    collection_id: string;
    nft_metadata_cid: string;
  };

  /**
   * @property apiRateLimit
   * @description Rate limit for API calls (requests per minute)
   * 
   * Controls how many API requests are allowed per minute from each client.
   * This is a mutable setting that may need adjustment based on usage patterns.
   * 
   * @example 60
   */
  @Prop({ 
    required: true, 
    type: Number,
    default: 60
  })
  @ApiProperty({
    type: Number,
    description: 'Rate limit for API calls (requests per minute)',
    example: 60,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  apiRateLimit: number;

  /**
   * @property adminAddresses
   * @description List of Hedera addresses with administrative privileges
   * 
   * Addresses that have system-wide administrative access. This is mutable
   * as administrative users may change over time.
   * 
   * @example ['0.0.123456', '0.0.789012']
   */
  @Prop({ 
    required: true, 
    type: [String],
    default: []
  })
  @ApiProperty({
    type: [String],
    description: 'List of Hedera addresses with administrative privileges',
    example: ['0.0.123456', '0.0.789012']
  })
  @IsOptional()
  adminAddresses: string[];

  /**
   * @property maintenanceMode
   * @description Whether the system is in maintenance mode
   * 
   * When true, limits functionality to administrative users only.
   * This is a mutable setting that controls system availability.
   * 
   * @example false
   */
  @Prop({ 
    required: true, 
    type: Boolean,
    default: false
  })
  @ApiProperty({
    type: Boolean,
    description: 'Whether the system is in maintenance mode',
    example: false
  })
  maintenanceMode: boolean;

  /**
   * @property customMetadata
   * @description Additional custom metadata for the configuration
   * 
   * Allows storing arbitrary key-value pairs for custom configuration
   * settings that may be needed for specific deployments or features.
   * 
   * @example {}
   */
  @Prop({ 
    required: false, 
    type: Object,
    default: {}
  })
  @ApiProperty({
    type: Object,
    description: 'Additional custom metadata for the configuration',
    example: {}
  })
  @IsOptional()
  @IsObject()
  customMetadata: Record<string, any>;

  /**
   * The timestamp when this configuration was created
   */
  createdAt?: Date;

  /**
   * The timestamp when this configuration was last updated
   */
  updatedAt?: Date;
}

/**
 * @const ConfigSchema
 * @description Mongoose schema for the Config entity
 * 
 * This schema is generated from the Config class and used for 
 * MongoDB operations.
 */
export const ConfigSchema = SchemaFactory.createForClass(Config);

/**
 * Configure schema to remove _id field from all query results
 * This ensures that MongoDB's default _id field is not included in responses
 */
ConfigSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret && typeof ret === 'object' && '_id' in ret) {
      delete ret._id;
    }
    return ret;
  },
  virtuals: true
});

ConfigSchema.set('toObject', {
  transform: (doc, ret) => {
    if (ret && typeof ret === 'object' && '_id' in ret) {
      delete ret._id;
    }
    return ret;
  },
  virtuals: true
}); 