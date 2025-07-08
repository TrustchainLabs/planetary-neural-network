import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsNotEmpty, IsObject, IsOptional, IsPositive, IsString, MaxLength, ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';

/**
 * DTO for creating a new proposal
 */
export class CreateProposalDto {
  /**
   * The ID of the DAO this proposal belongs to
   */
  @ApiProperty({
    description: 'ID of the DAO this proposal belongs to',
    example: 'dao-123'
  })
  @IsString()
  @IsNotEmpty()
  daoId: string;

  /**
   * The title of the proposal
   */
  @ApiProperty({
    description: 'Title of the proposal',
    example: 'Treasury Allocation'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  /**
   * The detailed description of the proposal
   */
  @ApiProperty({
    description: 'Detailed description of the proposal',
    example: 'This proposal aims to allocate 1000 tokens to the marketing budget'
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  /**
   * The address of the proposal creator
   */
  @ApiProperty({
    description: 'Address of the proposal creator',
    example: '0.0.123456'
  })
  @IsString()
  @IsNotEmpty()
  creatorAddress: string;

  /**
   * The voting duration in hours
   */
  @ApiProperty({
    description: 'Voting duration in hours',
    example: 72,
    minimum: 1
  })
  @IsPositive()
  votingDurationHours: number;

  /**
   * Custom proposal data
   */
  @ApiProperty({
    description: 'JSON data containing specific proposal details',
    example: { action: 'transfer', amount: 1000, recipient: '0.0.789012' },
    required: true
  })
  @IsObject()
  proposalData: Record<string, any>;

  /**
   * The voting options for this proposal
   */
  @ApiProperty({
    description: 'Custom voting options for this proposal',
    example: ['a - 50$', 'b - 1000$', 'c - 5000$'],
    required: false,
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsOptional()
  votingOptions?: string[];
} 