/**
 * @module VoteController
 * @description Controller handling vote management API endpoints
 * 
 * This module provides the REST API endpoints for creating and managing
 * votes on proposals within DAOs. It exposes operations for casting votes,
 * retrieving vote information, and analyzing voting results.
 * 
 * The controller delegates business logic to the VoteService while providing
 * a clean HTTP interface for client applications to interact with the voting system.
 */
import { 
  Body, 
  Controller,
  Get, 
  Param, 
  Post, 
  InternalServerErrorException, 
  BadRequestException, 
  NotFoundException,
  ValidationPipe
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VoteService } from './vote.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { Vote, VoteChoice } from './entities/vote.entity';
import { Error as MongooseError } from 'mongoose';

/**
 * @class VoteController
 * @description Controller for vote-related API endpoints
 * 
 * The VoteController exposes REST API endpoints for managing votes
 * within the DAO governance system. It provides operations for casting votes,
 * retrieving vote information, and analyzing voting results.
 * 
 * The controller integrates with authentication mechanisms to ensure that
 * only authorized users can cast votes on proposals, while making vote
 * information publicly available for transparency.
 */
@ApiTags('votes')
@Controller('votes')
export class VoteController {
  /**
   * @constructor
   * @description Creates a new instance of VoteController
   * 
   * @param {VoteService} voteService - Service for vote business logic
   */
  constructor(private readonly voteService: VoteService) {}

  /**
   * @method create
   * @description Casts a vote on a proposal
   * 
   * This method handles the creation of a new vote on a proposal. It requires
   * authentication and validates that the request comes from an authorized member
   * of the DAO. The method delegates the actual vote creation logic to the VoteService.
   * 
   * @param {CreateVoteDto} createVoteDto - Data for the new vote
   * @returns {Promise<Vote>} The created vote entity
   * 
   * @throws {BadRequestException} If validation fails, choice is invalid, or user has already voted
   * @throws {NotFoundException} If the proposal or DAO does not exist
   * @throws {InternalServerErrorException} If there's an unexpected error during creation
   */
  @Post()
  @ApiOperation({ summary: 'Cast a vote on a proposal' })
  @ApiResponse({ 
    status: 201, 
    description: 'The vote has been successfully cast.',
    type: Vote
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or voting constraints violated.' })
  @ApiResponse({ status: 404, description: 'Proposal or DAO not found.' })
  async create(@Body(new ValidationPipe()) createVoteDto: CreateVoteDto): Promise<Vote> {
    try {
      return await this.voteService.create(createVoteDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException({
          message: 'Validation failed',
          details: error.message,
          errors: error.errors
        });
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException({
          message: 'Validation failed',
          details: error.message
        });
      }
      if (error.name === 'MongoServerError' && error.code === 11000) {
        throw new BadRequestException('You have already voted on this proposal');
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create vote');
    }
  }

  /**
   * @method findByProposal
   * @description Retrieves all votes for a specific proposal
   * 
   * This method fetches all vote entities associated with a particular proposal.
   * It provides transparency into the voting process by making all votes visible,
   * which is a fundamental principle of DAO governance.
   * 
   * @param {string} proposalId - Unique identifier of the proposal
   * @returns {Promise<Vote[]>} Array of votes for the specified proposal
   * 
   * @throws {NotFoundException} If the proposal does not exist
   * @throws {InternalServerErrorException} If there's an unexpected error during retrieval
   */
  @Get('proposal/:proposalId')
  @ApiOperation({ summary: 'Get all votes for a proposal' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of votes for the specified proposal',
    type: [Vote]
  })
  @ApiResponse({ status: 404, description: 'Proposal not found.' })
  async findByProposal(@Param('proposalId') proposalId: string): Promise<Vote[]> {
    try {
      return await this.voteService.findByProposal(proposalId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve votes');
    }
  }

  /**
   * @method findOne
   * @description Retrieves a specific vote by its ID
   * 
   * This method fetches detailed information about a single vote entity.
   * It is useful for auditing and verifying individual votes within the
   * governance system.
   * 
   * @param {string} voteId - Unique identifier of the vote to retrieve
   * @returns {Promise<Vote>} The requested vote entity
   * 
   * @throws {NotFoundException} If the vote does not exist
   * @throws {InternalServerErrorException} If there's an unexpected error during retrieval
   */
  @Get(':voteId')
  @ApiOperation({ summary: 'Get a vote by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'The vote entity',
    type: Vote
  })
  @ApiResponse({ status: 404, description: 'Vote not found.' })
  async findOne(@Param('voteId') voteId: string): Promise<Vote> {
    try {
      return await this.voteService.findOne(voteId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve vote');
    }
  }

  /**
   * @method countVotesByChoice
   * @description Counts votes by choice for a specific proposal
   * 
   * This method tallies the votes cast on a proposal, categorizing them by
   * choice (YES, NO, ABSTAIN). It is crucial for determining the outcome of
   * governance proposals and ensuring transparency in the decision-making process.
   * 
   * @param {string} proposalId - Unique identifier of the proposal
   * @returns {Promise<Record<VoteChoice, number>>} Count of votes for each choice
   * 
   * @throws {NotFoundException} If the proposal does not exist
   * @throws {InternalServerErrorException} If there's an unexpected error during counting
   */
  @Get('proposal/:proposalId/count')
  @ApiOperation({ summary: 'Count votes by choice for a proposal' })
  @ApiResponse({ 
    status: 200, 
    description: 'Vote counts by choice (YES, NO, ABSTAIN)',
    schema: {
      type: 'object',
      properties: {
        YES: { type: 'number' },
        NO: { type: 'number' },
        ABSTAIN: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Proposal not found.' })
  async countVotesByChoice(@Param('proposalId') proposalId: string): Promise<Record<VoteChoice, number>> {
    try {
      return await this.voteService.countVotesByChoice(proposalId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to count votes');
    }
  }

  /**
   * @method findVoterVote
   * @description Retrieves a voter's vote on a specific proposal
   * 
   * This method enables a DAO member to verify their own vote on a proposal,
   * supporting transparency and allowing members to confirm their participation
   * in the governance process.
   * 
   * @param {string} proposalId - Unique identifier of the proposal
   * @param {string} voterAddress - Blockchain address of the voter
   * @returns {Promise<Vote>} The voter's vote on the specified proposal
   * 
   * @throws {NotFoundException} If the vote or proposal does not exist
   * @throws {InternalServerErrorException} If there's an unexpected error during retrieval
   */
  @Get('proposal/:proposalId/voter/:voterAddress')
  @ApiOperation({ summary: "Get a voter's vote on a proposal" })
  @ApiResponse({ 
    status: 200, 
    description: "The voter's vote",
    type: Vote
  })
  @ApiResponse({ status: 404, description: 'Vote not found or user has not voted.' })
  async findVoterVote(
    @Param('proposalId') proposalId: string,
    @Param('voterAddress') voterAddress: string
  ): Promise<Vote> {
    try {
      return await this.voteService.findVoterVote(proposalId, voterAddress);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve voter vote');
    }
  }
} 