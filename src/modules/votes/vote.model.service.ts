/**
 * @module VoteModelService
 * @description Service for vote data persistence and retrieval
 * 
 * This module provides a service for managing the persistence and retrieval
 * of Vote data in the database. It implements data access operations using
 * Mongoose models and provides a clean abstraction for interacting with the
 * Vote collection while maintaining relationships with DAOs and Proposals.
 * 
 * The service handles the complexities of vote validation, ensuring votes are
 * cast only on active proposals, preventing duplicate voting, and managing
 * the impact of votes on proposal status.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Vote, VoteDocument, VoteChoice } from './entities/vote.entity';
import { CreateVoteDto } from './dto/create-vote.dto';
import { DaoModelService } from '../daos/dao.model.service';
import { ProposalModelService } from '../proposals/proposal.model.service';
import { ProposalStatus } from '../proposals/entities/proposal.entity';
import { randomUUID } from 'crypto';
import { Proposal, ProposalDocument } from '../proposals/entities/proposal.entity';
import { Dao, DaoDocument } from '../daos/entities/dao.entity';

/**
 * @class VoteModelService
 * @description Service for Vote data operations in the database
 * 
 * The VoteModelService manages the Vote entity in the database, providing
 * methods for creating, finding, and analyzing votes. It enforces business
 * rules around voting, such as preventing duplicate votes, ensuring votes
 * are only cast on active proposals, and tallying votes to determine proposal
 * outcomes.
 * 
 * This service collaborates with DaoModelService and ProposalModelService to
 * maintain referential integrity and implement cross-entity business logic.
 */
@Injectable()
export class VoteModelService {
  /**
   * @constructor
   * @description Creates a new instance of VoteModelService
   * 
   * @param {Model<VoteDocument>} voteModel - Injected Mongoose model for Vote
   * @param {DaoModelService} daoModelService - Service for DAO data operations
   * @param {ProposalModelService} proposalModelService - Service for Proposal data operations
   */
  constructor(
    @InjectModel(Vote.name) private voteModel: Model<VoteDocument>,
    private readonly daoModelService: DaoModelService,
    private readonly proposalModelService: ProposalModelService
  ) {}

  /**
   * @method create
   * @description Creates a new vote in the database
   * 
   * This method creates a vote record after performing several validations:
   * - Verifies the DAO and proposal exist
   * - Ensures the proposal belongs to the specified DAO
   * - Checks that the proposal is active and voting period hasn't ended
   * - Prevents duplicate votes from the same voter on a proposal
   * 
   * After creating the vote, it updates the proposal to include this vote
   * and checks if the vote changes the proposal's status.
   * 
   * @param {CreateVoteDto} createVoteDto - Data Transfer Object containing vote creation data
   * @returns {Promise<Vote>} The created vote
   * 
   * @throws {NotFoundException} If the DAO or proposal doesn't exist
   * @throws {BadRequestException} If the proposal isn't active, voting period has ended,
   *                               proposal doesn't belong to the DAO, or voter has already voted
   */
  async create(createVoteDto: CreateVoteDto): Promise<Vote> {
    // Check if the DAO exists
    const dao = await this.daoModelService.findOne(createVoteDto.daoId) as DaoDocument;
    if (!dao) {
      throw new NotFoundException(`DAO with ID ${createVoteDto.daoId} not found`);
    }
    
    // Check if the proposal exists and is active
    const proposal = await this.proposalModelService.findOne(createVoteDto.proposalId) as ProposalDocument;
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${createVoteDto.proposalId} not found`);
    }
    
    // Verify proposal belongs to the specified DAO
    if (proposal.daoId !== createVoteDto.daoId) {
      throw new BadRequestException('Proposal does not belong to the specified DAO');
    }
    
    // Check if proposal is active
    if (proposal.status !== ProposalStatus.ACTIVE) {
      throw new BadRequestException(`Proposal with ID ${createVoteDto.proposalId} is not active`);
    }
    
    // Check if end time has passed
    if (proposal.endTime < new Date()) {
      throw new BadRequestException(`Proposal with ID ${createVoteDto.proposalId} voting period has ended`);
    }
    
    // Check if user has already voted
    const existingVote = await this.findVoterVote(createVoteDto.proposalId, createVoteDto.voterAddress);
    if (existingVote) {
      throw new BadRequestException(`Voter ${createVoteDto.voterAddress} has already voted on proposal ${createVoteDto.proposalId}`);
    }
    
    // Generate a unique ID for the vote
    const voteId = `vote-${randomUUID()}`;
    
    // Create the vote - Fix: use Mongoose model's create method instead of 'new'
    const voteData = {
      voteId,
      proposalId: createVoteDto.proposalId,
      proposal: proposal._id, // Reference to Proposal using MongoDB ObjectId
      daoId: createVoteDto.daoId,
      dao: dao._id, // Reference to DAO using MongoDB ObjectId
      voterAddress: createVoteDto.voterAddress,
      choice: createVoteDto.choice,
      weight: 1, // Default weight
      comment: createVoteDto.comment
    };
    
    const vote = await this.voteModel.create(voteData);
    
    // Update the proposal to add this vote to its votes array
    await this.proposalModelService.addVote(createVoteDto.proposalId, vote._id.toString());
    
    // Check if the vote changes the proposal status
    const daoThreshold = dao.votingRules.threshold;
    await this.checkProposalStatus(createVoteDto.proposalId, daoThreshold);
    
    return vote;
  }

  /**
   * @method findAll
   * @description Retrieves all votes from the database
   * 
   * This method fetches all vote records. In production systems with large
   * amounts of data, this would typically be paginated or have filters applied.
   * 
   * @returns {Promise<Vote[]>} Array of all votes
   */
  async findAll(): Promise<Vote[]> {
    return this.voteModel.find().exec();
  }

  /**
   * @method findOne
   * @description Finds a single vote by its ID
   * 
   * This method retrieves a specific vote using its unique identifier.
   * 
   * @param {string} voteId - The unique identifier of the vote to find
   * @returns {Promise<Vote>} The found vote
   * 
   * @throws {NotFoundException} If no vote with the given ID exists
   */
  async findOne(voteId: string): Promise<Vote> {
    const vote = await this.voteModel.findOne({ voteId }).exec();
    
    if (!vote) {
      throw new NotFoundException(`Vote with ID ${voteId} not found`);
    }
    
    return vote;
  }

  /**
   * @method findOneWithVotes
   * @description Finds a vote by ID with populated relationship fields
   * 
   * This method retrieves a vote and populates its related entities (proposal and DAO),
   * providing a complete view of the vote in its context.
   * 
   * @param {string} voteId - The unique identifier of the vote to find
   * @returns {Promise<Vote>} The found vote with populated related entities
   * 
   * @throws {NotFoundException} If no vote with the given ID exists
   */
  async findOneWithVotes(voteId: string): Promise<Vote> {
    const vote = await this.voteModel.findOne({ voteId })
      .populate('proposal')
      .populate('dao')
      .exec();
    
    if (!vote) {
      throw new NotFoundException(`Vote with ID ${voteId} not found`);
    }
    
    return vote;
  }

  /**
   * @method findByProposal
   * @description Finds all votes for a specific proposal
   * 
   * This method retrieves all votes cast on a particular proposal,
   * allowing for analysis of voting patterns and results.
   * 
   * @param {string} proposalId - The unique identifier of the proposal
   * @returns {Promise<Vote[]>} Array of votes for the specified proposal
   */
  async findByProposal(proposalId: string): Promise<Vote[]> {
    return this.voteModel.find({ proposalId }).exec();
  }

  /**
   * @method findVoterVote
   * @description Finds a specific voter's vote on a proposal
   * 
   * This method checks if a voter has already cast a vote on a specific proposal,
   * which is used to prevent duplicate voting and to retrieve a voter's choice.
   * 
   * @param {string} proposalId - The unique identifier of the proposal
   * @param {string} voterAddress - The address of the voter
   * @returns {Promise<Vote | null>} The vote if found, or null if the voter hasn't voted
   */
  async findVoterVote(proposalId: string, voterAddress: string): Promise<Vote | null> {
    return this.voteModel.findOne({
      proposalId,
      voterAddress
    }).exec();
  }

  /**
   * @method countVotesByChoice
   * @description Counts votes for a proposal grouped by choice
   * 
   * This method calculates the distribution of votes across different choices
   * for a specific proposal. It uses MongoDB aggregation to efficiently
   * group and count votes by their selected options.
   * 
   * @param {string} proposalId - Unique identifier of the proposal
   * @returns {Promise<Record<string, number>>} Object with vote counts for each choice
   */
  async countVotesByChoice(proposalId: string): Promise<Record<string, number>> {
    const results = await this.voteModel.aggregate([
      { $match: { proposalId } },
      { $group: {
          _id: '$choice',
          count: { $sum: '$weight' }
        }
      }
    ]).exec();
    
    // Fetch the proposal to get its voting options
    const proposal = await this.proposalModelService.findOne(proposalId);
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${proposalId} not found`);
    }
    
    // Initialize counts for all available options
    const counts: Record<string, number> = {};
    proposal.votingOptions.forEach(option => {
      counts[option] = 0;
    });
    
    // Fill in the actual counts
    for (const result of results) {
      if (counts[result._id] !== undefined) {
        counts[result._id] = result.count;
      }
    }
    
    return counts;
  }

  /**
   * @method checkProposalStatus
   * @description Evaluates vote counts to determine if a proposal's status should change
   * 
   * This method analyzes the current vote distribution for a proposal and updates
   * its status based on whether the approval threshold has been met or if it's
   * mathematically impossible to reach the threshold.
   * 
   * The status changes that can occur:
   * - ACTIVE → PASSED: When YES votes reach or exceed the threshold
   * - ACTIVE → REJECTED: When it becomes impossible to reach the threshold
   * 
   * @param {string} proposalId - The unique identifier of the proposal to check
   * @param {number} threshold - The percentage of YES votes required for approval
   * @returns {Promise<void>}
   */
  async checkProposalStatus(proposalId: string, threshold: number): Promise<void> {
    const voteCounts = await this.countVotesByChoice(proposalId);
    const totalVotes = voteCounts[VoteChoice.YES] + voteCounts[VoteChoice.NO] + voteCounts[VoteChoice.ABSTAIN];
    
    if (totalVotes === 0) return;
    
    // Calculate percentage of YES votes
    const yesPercentage = (voteCounts[VoteChoice.YES] / totalVotes) * 100;
    
    // If YES percentage meets or exceeds threshold, mark as PASSED
    if (yesPercentage >= threshold) {
      await this.proposalModelService.updateStatus(proposalId, ProposalStatus.PASSED);
    }
    // If NO percentage makes it impossible to reach threshold, mark as REJECTED
    else if ((voteCounts[VoteChoice.YES] + voteCounts[VoteChoice.ABSTAIN]) / totalVotes * 100 < threshold) {
      await this.proposalModelService.updateStatus(proposalId, ProposalStatus.REJECTED);
    }
  }
} 