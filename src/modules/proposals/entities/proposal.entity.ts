/**
 * @module ProposalEntity
 * @description Data model for DAO proposals
 * 
 * This module defines the data model for proposals within Decentralized Autonomous
 * Organizations (DAOs). It includes the proposal schema, validation rules, and
 * relationships with other entities like DAOs and votes. The module uses Mongoose
 * for object-document mapping and NestJS schema decorators.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoose from 'mongoose';
import { Dao } from '../../daos/entities/dao.entity';
import { Vote } from '../../votes/entities/vote.entity';

/**
 * @type ProposalDocument
 * @description Type definition for Proposal document in MongoDB
 * 
 * Combines the Proposal class with Mongoose Document capabilities
 */
export type ProposalDocument = Proposal & Document;

/**
 * @enum ProposalStatus
 * @description Enumeration of possible proposal states
 * 
 * - ACTIVE: The proposal is currently open for voting
 * - PASSED: The proposal has been approved but not yet executed
 * - REJECTED: The proposal failed to meet the approval threshold
 * - EXPIRED: The voting period ended without sufficient participation
 * - EXECUTED: The proposal was approved and its actions have been executed
 * - PENDING: The proposal is waiting to begin its voting period
 */
export enum ProposalStatus {
  ACTIVE = 'ACTIVE',
  PASSED = 'PASSED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  EXECUTED = 'EXECUTED',
  PENDING = 'PENDING'
}

/**
 * @class Proposal
 * @description Entity representing a proposal within a DAO
 * 
 * The Proposal class defines a governance proposal that DAO members can vote on.
 * It includes metadata about the proposal, its current status, voting period,
 * and relationships to the parent DAO and associated votes. The class uses
 * Mongoose schema decorators for MongoDB integration.
 */
@Schema({
  collection: 'dao_proposals',
  timestamps: true,
  validateBeforeSave: true
})
export class Proposal {
  /**
   * @property proposalId
   * @description Unique identifier for the proposal
   * 
   * This is a required, unique string that serves as the primary identifier
   * for the proposal across the system.
   * 
   * @example 'prop-123'
   */
  @Prop({ 
    required: true, 
    unique: true,
    type: String
  })
  @ApiProperty({
    type: String,
    description: 'Unique identifier for the proposal',
    example: 'prop-123'
  })
  @IsString()
  @IsNotEmpty()
  proposalId: string;
  
  /**
   * @property dao
   * @description Reference to the DAO this proposal belongs to
   * 
   * This property stores a MongoDB ObjectId reference to the parent DAO.
   * It establishes the many-to-one relationship between proposals and DAOs.
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
    description: 'Reference to the DAO this proposal belongs to',
    example: '507f1f77bcf86cd799439011'
  })
  dao: Dao | MongooseSchema.Types.ObjectId;
  
  /**
   * @property daoId
   * @description String ID of the DAO this proposal belongs to
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
    description: 'ID of the DAO this proposal belongs to',
    example: 'dao-123'
  })
  @IsString()
  @IsNotEmpty()
  daoId: string;
  
  /**
   * @property title
   * @description Title of the proposal
   * 
   * This property provides a concise, descriptive title for the proposal.
   * It is used for display purposes and should summarize the proposal's intent.
   * 
   * @example 'Treasury Allocation'
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: String
  })
  @ApiProperty({
    type: String,
    description: 'Title of the proposal',
    example: 'Treasury Allocation'
  })
  @IsString()
  @IsNotEmpty()
  title: string;
  
  /**
   * @property description
   * @description Detailed description of the proposal
   * 
   * This property provides a comprehensive explanation of the proposal's
   * purpose, rationale, and expected outcomes. It should contain all
   * information necessary for DAO members to make an informed voting decision.
   * 
   * @example 'This proposal aims to allocate 1000 tokens to the marketing budget'
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: String
  })
  @ApiProperty({
    type: String,
    description: 'Detailed description of the proposal',
    example: 'This proposal aims to allocate 1000 tokens to the marketing budget'
  })
  @IsString()
  description: string;
  
  /**
   * @property creatorAddress
   * @description Blockchain address of the proposal creator
   * 
   * This property stores the Hedera account ID or address of the user
   * who created the proposal. It is used for accountability and
   * access control.
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
    description: 'Address of the proposal creator',
    example: '0.0.123456'
  })
  @IsString()
  creatorAddress: string;
  
  /**
   * @property status
   * @description Current state of the proposal in its lifecycle
   * 
   * This property indicates the proposal's current state in the governance
   * process, from creation through voting to execution or rejection.
   * It affects what operations can be performed on the proposal.
   * 
   * @example ProposalStatus.ACTIVE
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: String,
    enum: ProposalStatus,
    default: ProposalStatus.PENDING
  })
  @ApiProperty({
    enum: ProposalStatus,
    description: 'Current status of the proposal',
    example: ProposalStatus.ACTIVE
  })
  @IsEnum(ProposalStatus)
  status: ProposalStatus;
  
  /**
   * @property startTime
   * @description Timestamp when voting begins
   * 
   * This property defines when the proposal's voting period begins.
   * Before this time, the proposal may be in a PENDING state.
   * 
   * @example '2023-07-01T00:00:00Z'
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: Date
  })
  @ApiProperty({
    type: Date,
    description: 'Start time of the voting period',
    example: '2023-07-01T00:00:00Z'
  })
  @IsDate()
  startTime: Date;
  
  /**
   * @property endTime
   * @description Timestamp when voting ends
   * 
   * This property defines when the proposal's voting period ends.
   * After this time, no more votes can be cast, and the proposal's
   * outcome is determined based on the votes received.
   * 
   * @example '2023-07-08T00:00:00Z'
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: Date
  })
  @ApiProperty({
    type: Date,
    description: 'End time of the voting period',
    example: '2023-07-08T00:00:00Z'
  })
  @IsDate()
  endTime: Date;
  
  /**
   * @property proposalData
   * @description Structured data specific to the proposal type
   * 
   * This property contains JSON data with details specific to the proposal's
   * type and intent. The structure varies based on what the proposal aims to do,
   * such as treasury allocations, parameter changes, or other governance actions.
   * 
   * @example { action: 'transfer', amount: 1000, recipient: '0.0.789012' }
   */
  @Prop({ 
    required: true, 
    unique: false,
    type: mongoose.Schema.Types.Mixed
  })
  @ApiProperty({
    type: Object,
    description: 'JSON data containing specific proposal details',
    example: { action: 'transfer', amount: 1000, recipient: '0.0.789012' }
  })
  proposalData: Record<string, any>;

  /**
   * @property votes
   * @description Votes cast on this proposal
   * 
   * This property represents the one-to-many relationship between
   * a proposal and its votes. It stores references to Vote documents
   * in the database, allowing for efficient querying of votes by proposal.
   */
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Vote' }],
    default: []
  })
  @ApiProperty({
    type: [String],
    description: 'Votes associated with this proposal',
    required: false
  })
  votes: Vote[] | MongooseSchema.Types.ObjectId[];

  /**
   * @property votingOptions
   * @description Custom voting options for this proposal
   * 
   * This array contains the available options that voters can choose from.
   * For traditional yes/no votes, this can contain ['YES', 'NO', 'ABSTAIN'].
   * For custom options, it can contain up to 5 different choices.
   * 
   * @example ['a - 50$', 'b - 1000$', 'c - 5000$']
   */
  @Prop({ 
    required: true, 
    type: [String],
    default: ['YES', 'NO', 'ABSTAIN'],
    validate: {
      validator: function(v: string[]) {
        return v.length > 0 && v.length <= 5;
      },
      message: props => `Voting options must have between 1 and 5 choices. Got ${props.value.length}.`
    }
  })
  @ApiProperty({
    type: [String],
    description: 'Available voting options for this proposal',
    example: ['a - 50$', 'b - 1000$', 'c - 5000$']
  })
  votingOptions: string[];

  /**
   * The timestamp when this proposal was created
   */
  createdAt?: Date;

  /**
   * The timestamp when this proposal was last updated
   */
  updatedAt?: Date;
}

/**
 * @const ProposalSchema
 * @description Mongoose schema for the Proposal class
 * 
 * This constant exports the generated Mongoose schema for the Proposal class,
 * which is used for MongoDB operations.
 */
export const ProposalSchema = SchemaFactory.createForClass(Proposal);

/**
 * Configure schema to remove _id field from all query results
 * This ensures that MongoDB's default _id field is not included in responses
 * The transform safely handles different document structures
 */
ProposalSchema.set('toJSON', {
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

ProposalSchema.set('toObject', {
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
ProposalSchema.index({ proposalId: 1 }, { unique: true });
ProposalSchema.index({ daoId: 1 });
ProposalSchema.index({ status: 1 });
ProposalSchema.index({ endTime: 1 }); 