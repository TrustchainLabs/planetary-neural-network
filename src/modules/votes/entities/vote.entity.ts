/**
 * @module VoteEntity
 * @description Data model for DAO proposal votes
 * 
 * This module defines the data model for votes within a Decentralized Autonomous
 * Organization (DAO) governance system. It includes the vote schema, validation
 * rules, and relationships with other entities like DAOs and proposals. The module
 * uses Mongoose for object-document mapping and NestJS schema decorators.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Proposal } from '../../proposals/entities/proposal.entity';
import { Dao } from '../../daos/entities/dao.entity';

/**
 * @type VoteDocument
 * @description Type definition for Vote document in MongoDB
 * 
 * Combines the Vote class with Mongoose Document capabilities
 */
export type VoteDocument = Vote & Document;

/**
 * @enum VoteChoice
 * @description Enumeration of possible voting options
 * 
 * - YES: Vote in favor of the proposal
 * - NO: Vote against the proposal
 * - ABSTAIN: Formally participate but neither support nor oppose
 */
export enum VoteChoice {
  YES = 'YES',
  NO = 'NO',
  ABSTAIN = 'ABSTAIN'
}

/**
 * @class Vote
 * @description Entity representing a vote on a DAO proposal
 * 
 * The Vote class defines a member's vote on a governance proposal within a DAO.
 * It includes information about the voter, their choice, the associated proposal
 * and DAO, and any additional context like voting weight or comments. The class
 * uses Mongoose schema decorators for MongoDB integration.
 */
@Schema({
  collection: 'dao_votes',
  timestamps: true,
  validateBeforeSave: true
})
export class Vote {
  /**
   * @property voteId
   * @description Unique identifier for the vote
   * 
   * This is a required, unique string that serves as the primary identifier
   * for the vote across the system.
   * 
   * @example 'vote-123'
   */
  @Prop({ 
    required: true, 
    unique: true,
    type: String
  })
  @ApiProperty({
    type: String,
    description: 'Unique identifier for the vote',
    example: 'vote-123'
  })
  @IsString()
  @IsNotEmpty()
  voteId: string;
  
  /**
   * @property proposal
   * @description Reference to the proposal this vote is cast on
   * 
   * This property stores a MongoDB ObjectId reference to the associated proposal.
   * It establishes the many-to-one relationship between votes and proposals.
   * 
   * @example '507f1f77bcf86cd799439011'
   */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Proposal',
    required: true
  })
  @ApiProperty({
    type: String,
    description: 'Reference to the proposal this vote belongs to',
    example: '507f1f77bcf86cd799439011'
  })
  proposal: Proposal | MongooseSchema.Types.ObjectId;
  
  /**
   * @property proposalId
   * @description String ID of the proposal this vote is cast on
   * 
   * This property stores the string identifier of the associated proposal.
   * It is maintained for backward compatibility and easier querying.
   * 
   * @example 'prop-123'
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: String
  })
  @ApiProperty({
    type: String,
    description: 'ID of the proposal this vote belongs to',
    example: 'prop-123'
  })
  @IsString()
  @IsNotEmpty()
  proposalId: string;
  
  /**
   * @property dao
   * @description Reference to the DAO this vote belongs to
   * 
   * This property stores a MongoDB ObjectId reference to the parent DAO.
   * It establishes the many-to-one relationship between votes and DAOs,
   * and enables efficient querying of votes within a specific DAO.
   * 
   * @example '507f1f77bcf86cd799439011'
   */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Dao',
    required: true
  })
  @ApiProperty({
    type: String,
    description: 'Reference to the DAO this vote belongs to',
    example: '507f1f77bcf86cd799439011'
  })
  dao: Dao | MongooseSchema.Types.ObjectId;
  
  /**
   * @property daoId
   * @description String ID of the DAO this vote belongs to
   * 
   * This property stores the string identifier of the parent DAO.
   * It is maintained for backward compatibility and easier querying.
   * 
   * @example 'dao-123'
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: String
  })
  @ApiProperty({
    type: String,
    description: 'ID of the DAO this vote belongs to',
    example: 'dao-123'
  })
  @IsString()
  @IsNotEmpty()
  daoId: string;
  
  /**
   * @property voterAddress
   * @description Blockchain address of the member casting the vote
   * 
   * This property stores the Hedera account ID or address of the user
   * who cast the vote. It is used for uniqueness constraints (one vote
   * per member per proposal) and accountability.
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
    description: 'Address of the voter',
    example: '0.0.123456'
  })
  @IsString()
  voterAddress: string;
  
  /**
   * @property choice
   * @description Choice made by the voter
   * 
   * This property stores the voter's selection from the available options.
   * It can be a standard choice (YES, NO, ABSTAIN) or a custom option
   * defined in the proposal's votingOptions array.
   * 
   * @example 'a - 50$'
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: String
  })
  @ApiProperty({
    type: String,
    description: 'Choice made by the voter',
    example: 'a - 50$'
  })
  @IsString()
  @IsNotEmpty()
  choice: string;
  
  /**
   * @property weight
   * @description Voting power (weight) assigned to this vote
   * 
   * This property defines the relative influence of the vote on the proposal's
   * outcome. In token-weighted voting systems, this often corresponds to the
   * number of governance tokens held by the voter. Default is 1 for equal voting.
   * 
   * @example 10
   */
  @Prop({ 
    required: false, 
    unique: false,
    type: Number,
    default: 1
  })
  @ApiProperty({
    type: Number,
    description: 'Voting power (weight) of this vote',
    example: 10,
    required: false
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  weight: number;
  
  /**
   * @property comment
   * @description Optional explanation provided by the voter
   * 
   * This property allows voters to include additional context or reasoning
   * with their vote. It helps promote transparency and deliberation in the
   * governance process.
   * 
   * @example 'I support this proposal because...'
   */
  @Prop({ 
    required: false, 
    unique: false,
    type: String
  })
  @ApiProperty({
    type: String,
    description: 'Optional comment provided by the voter',
    example: 'I support this proposal because...',
    required: false
  })
  @IsString()
  @IsOptional()
  comment?: string;

  /**
   * The timestamp when this vote was created
   */
  createdAt?: Date;

  /**
   * The timestamp when this vote was last updated
   */
  updatedAt?: Date;
}

/**
 * @const VoteSchema
 * @description Mongoose schema for the Vote class
 * 
 * This constant exports the generated Mongoose schema for the Vote class,
 * which is used for MongoDB operations. It also defines indexes for optimizing
 * common query patterns and enforcing constraints like one vote per member
 * per proposal.
 */
export const VoteSchema = SchemaFactory.createForClass(Vote);

/**
 * Configure schema to remove _id field from all query results
 * This ensures that MongoDB's default _id field is not included in responses
 * The transform safely handles different document structures
 */
VoteSchema.set('toJSON', {
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

VoteSchema.set('toObject', {
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

// Create indexes for common query patterns
VoteSchema.index({ proposalId: 1 });
VoteSchema.index({ daoId: 1 });
VoteSchema.index({ voterAddress: 1 });
VoteSchema.index({ proposalId: 1, voterAddress: 1 }, { unique: true }); // Ensure one vote per voter per proposal 