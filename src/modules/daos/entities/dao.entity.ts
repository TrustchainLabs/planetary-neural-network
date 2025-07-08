/**
 * @module DaoEntity
 * @description Data model for Decentralized Autonomous Organizations
 * 
 * This module defines the data model for Decentralized Autonomous Organizations (DAOs),
 * including their properties, relationships, and validation rules. It uses Mongoose
 * for object-document mapping and NestJS schema decorators for validation.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Proposal } from '../../proposals/entities/proposal.entity';

/**
 * @type DaoDocument
 * @description Type definition for DAO document in MongoDB
 * 
 * Combines the Dao class with Mongoose Document capabilities
 */
export type DaoDocument = Dao & Document;

/**
 * @enum DaoStatus
 * @description Enum representing the possible states of a DAO
 * 
 * - ACTIVE: The DAO is fully operational and can process proposals and votes
 * - INACTIVE: The DAO has been deactivated and cannot process new activities
 * - PENDING: The DAO is in the process of being created or initialized
 */
export enum DaoStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING'
}

/**
 * @class Dao
 * @description Represents a DAO (Decentralized Autonomous Organization) entity
 * 
 * The Dao class defines the structure and validation rules for DAO entities.
 * It includes information about the DAO's identification, configuration,
 * membership, and associated proposals. The class uses Mongoose schema
 * decorators for MongoDB integration and class-validator decorators for
 * input validation.
 */
@Schema({
  collection: 'dao_entities',
  timestamps: true,
  validateBeforeSave: true
})
export class Dao {
  /**
   * @property daoId
   * @description The unique identifier for the DAO
   * 
   * This is a required, unique string that serves as the primary identifier
   * for the DAO across the system. It should follow a consistent format
   * and be used as the reference for all operations related to this DAO.
   * 
   * @example 'dao-123'
   */
  @Prop({ 
    required: true, 
    unique: true,
    type: String
  })
  @ApiProperty({
    type: String,
    description: 'Unique identifier for the DAO',
    example: 'dao-123'
  })
  @IsString()
  @IsNotEmpty()
  daoId: string;

  /**
   * @property name
   * @description The human-readable name of the DAO
   * 
   * This is a required string that provides a descriptive name for the DAO.
   * It is used for display purposes and should be meaningful to users.
   * 
   * @example 'My DAO'
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: String
  })
  @ApiProperty({
    type: String,
    description: 'Name of the DAO',
    example: 'My DAO'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * @property description
   * @description A detailed description of the DAO's purpose and activities
   * 
   * This property provides information about the DAO's goals, activities,
   * and other relevant details. It helps users understand the purpose
   * and scope of the organization.
   * 
   * @example 'A community DAO for decision making'
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: String
  })
  @ApiProperty({
    type: String,
    description: 'Description of the DAO',
    example: 'A community DAO for decision making'
  })
  @IsString()
  description: string;

  /**
   * @property ownerAddress
   * @description The blockchain address of the DAO's creator/owner
   * 
   * This property stores the Hedera account ID or address of the
   * user who created the DAO and has administrative privileges.
   * It is used for access control and accountability.
   * 
   * @example '0.0.123456'
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: String
  })
  @ApiProperty({
    type: String,
    description: 'Owner address of the DAO',
    example: '0.0.123456'
  })
  @IsString()
  ownerAddress: string;

  /**
   * @property status
   * @description The current operational status of the DAO
   * 
   * This property indicates whether the DAO is active, inactive,
   * or in a pending state. It affects the ability to create proposals,
   * cast votes, and perform other operations within the DAO.
   * 
   * @example DaoStatus.ACTIVE
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: String,
    enum: DaoStatus,
    default: DaoStatus.PENDING
  })
  @ApiProperty({
    enum: DaoStatus,
    description: 'Status of the DAO',
    example: DaoStatus.ACTIVE
  })
  @IsEnum(DaoStatus)
  status: DaoStatus;

  /**
   * @property votingRules
   * @description Configuration for the DAO's voting process
   * 
   * This object defines the rules and parameters for voting on proposals
   * within the DAO, including approval thresholds, voting periods,
   * and whether voting power is weighted by token holdings.
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: Object
  })
  @ApiProperty({
    type: Object,
    description: 'Voting rules for the DAO'
  })
  votingRules: {
    /**
     * The threshold required for proposal approval (percentage)
     */
    threshold: number;
    /**
     * Minimum duration of voting period in hours
     */
    minVotingPeriod: number;
    /**
     * Whether voting is weighted based on tokens
     */
    tokenWeighted: boolean;
  };

  /**
   * @property members
   * @description List of blockchain addresses of DAO members
   * 
   * This array contains the Hedera account IDs or addresses of users
   * who are members of the DAO. Members typically have the ability
   * to create proposals and vote on them, depending on the DAO's
   * configuration.
   * 
   * @example ['0.0.123456', '0.0.789012']
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: [String],
    default: []
  })
  @IsArray()
  @ApiProperty({
    type: [String],
    description: 'List of member addresses',
    example: ['0.0.123456', '0.0.789012']
  })
  members: string[];

  /**
   * @property proposals
   * @description Proposals associated with this DAO
   * 
   * This property represents the one-to-many relationship between
   * a DAO and its proposals. It stores references to Proposal documents
   * in the database, allowing for efficient querying of proposals
   * by DAO.
   */
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Proposal' }],
    default: []
  })
  @ApiProperty({
    type: [String],
    description: 'Proposals associated with this DAO',
    required: false
  })
  proposals: Proposal[] | MongooseSchema.Types.ObjectId[];

  /**
   * The timestamp when this DAO was created
   */
  createdAt?: Date;

  /**
   * The timestamp when this DAO was last updated
   */
  updatedAt?: Date;
}

/**
 * @const DaoSchema
 * @description Mongoose schema for the Dao class
 * 
 * This constant exports the generated Mongoose schema for the Dao class,
 * which is used for MongoDB operations.
 */
export const DaoSchema = SchemaFactory.createForClass(Dao);

/**
 * Configure schema to remove _id field from all query results
 * This ensures that MongoDB's default _id field is not included in responses
 * The transform safely handles different document structures
 */
DaoSchema.set('toJSON', {
  transform: (doc, ret) => {
    // Only delete the _id if it exists and transformation is safe
    if (ret && typeof ret === 'object' && '_id' in ret) {
      delete ret._id;
    }
    return ret;
  },
  // Maintain virtuals in the output
  virtuals: true
});

DaoSchema.set('toObject', {
  transform: (doc, ret) => {
    // Only delete the _id if it exists and transformation is safe
    if (ret && typeof ret === 'object' && '_id' in ret) {
      delete ret._id;
    }
    return ret;
  },
  // Maintain virtuals in the output
  virtuals: true
}); 