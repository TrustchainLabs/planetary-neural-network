/**
 * @module CreateVoteDto
 * @description Data Transfer Object for vote creation
 * 
 * This module defines the DTO (Data Transfer Object) used for creating new votes
 * on proposals within DAOs. It includes validation rules and documentation for API
 * clients. The module uses class-validator for input validation and class-transformer
 * for type conversion.
 * 
 * The DTO enforces validation rules to ensure that votes contain all required
 * information and conform to the expected formats before being processed by the
 * application's business logic.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { VoteChoice } from '../entities/vote.entity';

/**
 * @class CreateVoteDto
 * @description DTO for creating a new vote on a proposal
 * 
 * This class defines the structure and validation rules for vote creation requests.
 * It ensures that votes include references to the proposal and DAO they belong to,
 * identification of the voter, and the voter's choice.
 * 
 * Each vote must specify:
 * - The proposal being voted on
 * - The DAO the proposal belongs to
 * - The address of the voter
 * - The voting choice (YES, NO, or ABSTAIN)
 * - An optional comment to explain the voter's decision
 */
export class CreateVoteDto {
  /**
   * @property proposalId
   * @description The unique identifier of the proposal to vote on
   * 
   * This ID links the vote to a specific proposal and is used to validate
   * that the proposal exists and is active before allowing the vote to be cast.
   * 
   * @example 'prop-123'
   */
  @ApiProperty({
    description: 'ID of the proposal to vote on',
    example: 'prop-123'
  })
  @IsString()
  @IsNotEmpty()
  proposalId: string;

  /**
   * @property daoId
   * @description The unique identifier of the DAO the proposal belongs to
   * 
   * This ID is used to verify that the proposal belongs to the specified DAO
   * and that the voter has the necessary permissions to vote in this DAO.
   * It also ensures referential integrity between votes, proposals, and DAOs.
   * 
   * @example 'dao-123'
   */
  @ApiProperty({
    description: 'ID of the DAO the proposal belongs to',
    example: 'dao-123'
  })
  @IsString()
  @IsNotEmpty()
  daoId: string;

  /**
   * @property voterAddress
   * @description The blockchain address of the voter
   * 
   * This address identifies the member casting the vote and is used to:
   * - Verify membership in the DAO
   * - Prevent duplicate voting
   * - Associate the vote with the correct member for transparency
   * 
   * In token-weighted voting systems, this address would also be used to
   * determine the voter's voting power.
   * 
   * @example '0.0.123456'
   */
  @ApiProperty({
    description: 'Address of the voter',
    example: '0.0.123456'
  })
  @IsString()
  @IsNotEmpty()
  voterAddress: string;

  /**
   * @property choice
   * @description The voting choice selected by the voter
   * 
   * This property specifies how the member is voting on the proposal.
   * The choice can be one of the standard values (YES, NO, ABSTAIN)
   * or a custom option defined in the proposal's votingOptions array.
   * 
   * @example 'a - 50$'
   */
  @ApiProperty({
    description: 'Choice made by the voter',
    example: 'a - 50$',
    type: String
  })
  @IsString()
  @IsNotEmpty()
  choice: string;

  /**
   * @property comment
   * @description Optional comment explaining the vote decision
   * 
   * This property allows voters to explain their voting decision, providing
   * transparency and context for their choice. Comments are optional and
   * do not affect the voting outcome but can be valuable for DAO governance
   * and member communication.
   * 
   * @example 'I support this proposal because it aligns with our mission and goals'
   * @optional
   */
  @ApiProperty({
    description: 'Optional comment provided by the voter',
    example: 'I support this proposal because...',
    required: false
  })
  @IsString()
  @IsOptional()
  comment?: string;
} 