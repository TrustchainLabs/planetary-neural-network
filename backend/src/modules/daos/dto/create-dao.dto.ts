/**
 * @module CreateDaoDto
 * @description Data Transfer Objects for DAO creation
 * 
 * This module defines DTOs (Data Transfer Objects) used for creating new DAOs,
 * including validation rules and documentation for API clients. It uses
 * class-validator for input validation and class-transformer for type conversion.
 */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max, Min, ValidateNested } from 'class-validator';

/**
 * @class VotingRulesDto
 * @description DTO for configuring voting rules within a DAO
 * 
 * This class defines the structure and validation rules for the voting configuration
 * of a DAO, including approval thresholds, voting periods, and voting mechanisms.
 * It is used as a nested object within the CreateDaoDto.
 */
export class VotingRulesDto {
  /**
   * @property threshold
   * @description The threshold required for proposal approval (percentage)
   * 
   * This number represents the percentage of votes required for a proposal
   * to be approved. It must be between 1 and 100.
   * 
   * @example 51 (representing 51% approval required)
   */
  @ApiProperty({
    description: 'Threshold required for proposal approval (percentage)',
    example: 51,
    minimum: 1,
    maximum: 100
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  threshold: number;

  /**
   * @property minVotingPeriod
   * @description Minimum duration of voting period in hours
   * 
   * This number represents the minimum time (in hours) that a proposal must remain
   * open for voting before it can be finalized. It must be a positive number.
   * 
   * @example 72 (representing a 3-day minimum voting period)
   */
  @ApiProperty({
    description: 'Minimum duration of voting period in hours',
    example: 72,
    minimum: 1
  })
  @IsNumber()
  @IsPositive()
  minVotingPeriod: number;

  /**
   * @property tokenWeighted
   * @description Whether voting is weighted based on tokens
   * 
   * When true, votes are weighted by the number of tokens held by the voter,
   * giving more influence to those with higher token holdings. When false,
   * each member's vote has equal weight regardless of token holdings.
   * 
   * @example true
   */
  @ApiProperty({
    description: 'Whether voting is weighted based on tokens',
    example: true
  })
  @IsBoolean()
  tokenWeighted: boolean;
}

/**
 * @class CreateDaoDto
 * @description DTO for creating a new Decentralized Autonomous Organization
 * 
 * This class defines the structure and validation rules for data used to create
 * a new DAO. It includes basic information about the DAO, its configuration,
 * and initial membership. The class uses class-validator decorators for validation
 * and class-transformer for handling nested objects.
 */
export class CreateDaoDto {
  /**
   * @property name
   * @description The human-readable name of the DAO
   * 
   * This string provides a descriptive name for the DAO and is used for display
   * purposes. It must not be empty.
   * 
   * @example 'My DAO'
   */
  @ApiProperty({
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
   * This string provides information about the DAO's goals, activities, and
   * other relevant details. It must not be empty.
   * 
   * @example 'A community DAO for decision making'
   */
  @ApiProperty({
    description: 'Description of the DAO',
    example: 'A community DAO for decision making'
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  /**
   * @property ownerAddress
   * @description The blockchain address of the DAO's creator/owner
   * 
   * This string represents the Hedera account ID or address of the user creating
   * the DAO. It is used for access control and administrative operations.
   * 
   * @example '0.0.123456'
   */
  @ApiProperty({
    description: 'Owner address of the DAO',
    example: '0.0.123456'
  })
  @IsString()
  @IsNotEmpty()
  ownerAddress: string;

  /**
   * @property votingRules
   * @description Configuration for the DAO's voting process
   * 
   * This nested object defines the rules and parameters for voting on proposals
   * within the DAO. It includes settings for approval thresholds, voting periods,
   * and voting mechanisms.
   */
  @ApiProperty({
    description: 'Voting rules for the DAO',
    type: VotingRulesDto
  })
  @ValidateNested()
  @Type(() => VotingRulesDto)
  @IsNotEmpty()
  votingRules: VotingRulesDto;

  /**
   * @property members
   * @description Initial list of blockchain addresses of DAO members
   * 
   * This optional array contains the Hedera account IDs or addresses of users
   * who will be members of the DAO upon creation. If not provided, the DAO
   * will initially have only the owner as a member.
   * 
   * @example ['0.0.123456', '0.0.789012']
   */
  @ApiProperty({
    description: 'Initial list of member addresses',
    example: ['0.0.123456', '0.0.789012'],
    required: false,
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  members?: string[];
} 