/**
 * @module VoteService
 * @description Service handling vote business logic
 * 
 * This module provides a service for managing the business logic related to
 * votes on proposals within DAOs. It coordinates data operations, manages background
 * tasks through Bull queues, and implements the core voting functionality
 * including vote creation, retrieval, and counting.
 * 
 * The service handles the complexities of the voting process, including
 * validating votes, queuing background jobs for additional processing,
 * and providing methods to retrieve and analyze voting results.
 */
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { VoteModelService } from './vote.model.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { Vote, VoteChoice } from './entities/vote.entity';
import { ProposalModelService } from '../proposals/proposal.model.service';
import { ProposalStatus } from '../proposals/entities/proposal.entity';
import { DaoModelService } from '../daos/dao.model.service';

/**
 * @class VoteService
 * @description Service for vote business logic operations
 * 
 * The VoteService implements the core business logic for vote management
 * in the DAO system. It delegates data operations to the VoteModelService
 * and uses Bull queues to handle background processing of vote-related tasks.
 * 
 * This service acts as a facade between the controllers and the data layer,
 * providing a clean API for vote operations while hiding implementation
 * details like data access and background processing.
 */
@Injectable()
export class VoteService {
  /**
   * @constructor
   * @description Creates a new instance of VoteService
   * 
   * @param {VoteModelService} voteModelService - Service for vote data operations
   * @param {Queue} voteQueue - Bull queue for vote background processing
   * @param {ProposalModelService} proposalModelService - Service for proposal data operations
   * @param {DaoModelService} daoModelService - Service for DAO data operations
   */
  constructor(
    private readonly voteModelService: VoteModelService,
    @InjectQueue('dao') private readonly voteQueue: Queue,
    private readonly proposalModelService: ProposalModelService,
    private readonly daoModelService: DaoModelService
  ) {}

  /**
   * @method create
   * @description Creates a new vote on a proposal
   * 
   * This method handles the creation of a new vote on a proposal. It performs
   * the following validation steps:
   * 1. Validates that the proposal exists
   * 2. Validates that the proposal is in ACTIVE status
   * 3. Validates that the voting period has not ended
   * 4. Validates that the DAO exists
   * 5. Validates that the voter is a member of the DAO
   * 6. Validates that the voter has not already voted on this proposal
   * 7. Validates that the choice is among the proposal's allowed voting options
   * 
   * If all validations pass, it:
   * 1. Delegates to VoteModelService to create the vote in the database
   * 2. Queues a background job to perform additional processing on the new vote
   * 
   * The background job enables asynchronous processing such as updating proposal
   * statistics, blockchain interactions, or notifications without blocking the API response.
   * 
   * @param {CreateVoteDto} createVoteDto - Data transfer object containing vote creation parameters
   * @returns {Promise<Vote>} The newly created vote entity
   * 
   * @throws {NotFoundException} If the proposal or DAO does not exist
   * @throws {BadRequestException} If the proposal is not active, voting period has ended, voter is not a DAO member, or choice is invalid
   * @throws {ConflictException} If the user has already voted on this proposal
   */
  async create(createVoteDto: CreateVoteDto): Promise<Vote> {
    // 1. Fetch and validate that the proposal exists
    const proposal = await this.proposalModelService.findOne(createVoteDto.proposalId);
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${createVoteDto.proposalId} not found`);
    }
    
    // 2. Validate that the proposal is in ACTIVE status
    if (proposal.status !== ProposalStatus.ACTIVE) {
      throw new BadRequestException(`Proposal is not active. Current status: ${proposal.status}`);
    }
    
    // 3. Validate that the voting period has not ended
    const now = new Date();
    if (proposal.endTime && new Date(proposal.endTime) < now) {
      throw new BadRequestException(`Voting period has ended on ${proposal.endTime}`);
    }
    
    // 4. Validate that the DAO exists
    const dao = await this.daoModelService.findOne(proposal.daoId);
    if (!dao) {
      throw new NotFoundException(`DAO with ID ${proposal.daoId} not found`);
    }
    
    // 5. Validate that the voter is a member of the DAO
    const isMember = await this.daoModelService.isMember(proposal.daoId, createVoteDto.voterAddress);
    if (!isMember) {
      throw new BadRequestException(`Voter ${createVoteDto.voterAddress} is not a member of DAO ${proposal.daoId}`);
    }
    
    // 6. Validate that the voter has not already voted on this proposal
    const existingVote = await this.voteModelService.findVoterVote(
      createVoteDto.proposalId,
      createVoteDto.voterAddress
    );
    if (existingVote) {
      throw new ConflictException(`Voter ${createVoteDto.voterAddress} has already voted on proposal ${createVoteDto.proposalId}`);
    }
    
    // 7. Validate that the choice is among the proposal's voting options
    if (!proposal.votingOptions.includes(createVoteDto.choice)) {
      throw new BadRequestException(
        `Invalid vote choice. Must be one of: ${proposal.votingOptions.join(', ')}`
      );
    }
    
    // All validations passed, create the vote in the database
    const vote = await this.voteModelService.create(createVoteDto);
    
    // Queue a job to process the vote creation
    await this.voteQueue.add('process-vote-creation', {
      voteId: vote.voteId,
      proposalId: vote.proposalId,
      daoId: vote.daoId,
      voterAddress: vote.voterAddress,
      choice: vote.choice
    }, { 
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });
    
    return vote;
  }

  /**
   * @method findByProposal
   * @description Retrieves all votes for a specific proposal
   * 
   * This method fetches all vote entities from the database that are
   * associated with a particular proposal. It's useful for calculating
   * vote totals, analyzing voter participation, and generating reports.
   * 
   * @param {string} proposalId - Unique identifier of the proposal
   * @returns {Promise<Vote[]>} Array of votes for the specified proposal
   */
  async findByProposal(proposalId: string): Promise<Vote[]> {
    return this.voteModelService.findByProposal(proposalId);
  }

  /**
   * @method findOne
   * @description Retrieves a specific vote by its ID
   * 
   * This method fetches a single vote entity from the database based on
   * its unique identifier. It enhances the model service's findOne by adding
   * proper error handling, throwing a NotFoundException if the vote
   * doesn't exist.
   * 
   * @param {string} voteId - Unique identifier of the vote to retrieve
   * @returns {Promise<Vote>} The requested vote entity
   * 
   * @throws {NotFoundException} If the vote with the specified ID does not exist
   */
  async findOne(voteId: string): Promise<Vote> {
    const vote = await this.voteModelService.findOne(voteId);
    if (!vote) {
      throw new NotFoundException(`Vote with ID ${voteId} not found`);
    }
    return vote;
  }

  /**
   * @method findOneWithVotes
   * @description Retrieves a vote with its related entities
   * 
   * This method fetches a vote entity from the database along with its
   * associated proposal and DAO entities. This provides a complete view of the
   * vote including its context within the DAO governance system.
   * 
   * @param {string} voteId - Unique identifier of the vote to retrieve
   * @returns {Promise<Vote>} The vote with populated relations
   * 
   * @throws {NotFoundException} If the vote with the specified ID does not exist
   */
  async findOneWithVotes(voteId: string): Promise<Vote> {
    return this.voteModelService.findOneWithVotes(voteId);
  }

  /**
   * @method countVotesByChoice
   * @description Counts votes grouped by choice for a specific proposal
   * 
   * This method analyzes all votes for a specific proposal and returns
   * a count of how many votes were cast for each available option.
   * It dynamically handles both standard and custom voting options.
   * 
   * @param {string} proposalId - Unique identifier of the proposal
   * @returns {Promise<Record<string, number>>} Object with vote counts for each option
   */
  async countVotesByChoice(proposalId: string): Promise<Record<string, number>> {
    const votes = await this.findByProposal(proposalId);
    const proposal = await this.proposalModelService.findOne(proposalId);
    
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${proposalId} not found`);
    }
    
    // Initialize count object with all possible choices set to 0
    const voteCounts: Record<string, number> = {};
    proposal.votingOptions.forEach(option => {
      voteCounts[option] = 0;
    });
    
    // Count votes for each choice
    votes.forEach(vote => {
      if (voteCounts[vote.choice] !== undefined) {
        voteCounts[vote.choice] += vote.weight || 1;
      }
    });
    
    return voteCounts;
  }

  /**
   * @method findVoterVote
   * @description Finds a specific voter's vote on a proposal
   * 
   * This method retrieves a vote cast by a specific voter on a specific proposal.
   * It's useful for checking if a user has already voted and what their choice was,
   * which can be used to prevent duplicate votes or show users their previous votes.
   * 
   * @param {string} proposalId - Unique identifier of the proposal
   * @param {string} voterAddress - Blockchain address of the voter
   * @returns {Promise<Vote>} The vote entity or null if the voter hasn't voted
   */
  async findVoterVote(proposalId: string, voterAddress: string): Promise<Vote> {
    const vote = await this.voteModelService.findVoterVote(proposalId, voterAddress);
    if (!vote) {
      return null;
    }
    return vote;
  }
} 