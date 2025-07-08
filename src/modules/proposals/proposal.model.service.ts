import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Proposal, ProposalDocument, ProposalStatus } from './entities/proposal.entity';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { DaoModelService } from '../daos/dao.model.service';
import { Dao, DaoDocument } from '../daos/entities/dao.entity';
import { randomUUID } from 'crypto';

/**
 * Proposal Model Service Module
 * 
 * This module provides data persistence and retrieval services for the Proposal entity.
 * It manages all database operations related to proposals in DAOs, serving as the
 * data access layer for proposal management. This service ensures data integrity,
 * handles relationships between proposals, DAOs, and votes, and enforces business
 * rules at the data level.
 * 
 * The service interacts directly with the Mongoose models to perform CRUD operations
 * and implements specialized queries for retrieving proposals based on different criteria.
 */

/**
 * Service for managing Proposal models in the database.
 * 
 * The ProposalModelService provides methods for creating, retrieving, updating, and
 * managing proposals in the DAO platform. It handles the persistence and retrieval of
 * proposal data, enforces data validation rules, and manages the relationships between
 * proposals, DAOs, and votes.
 * 
 * This service is responsible for:
 * - Creating new proposals with proper validation
 * - Retrieving proposals by various criteria (ID, DAO, status)
 * - Managing proposal lifecycle (updating status, handling expiration)
 * - Connecting proposals with votes and DAOs
 * 
 * The service works closely with the DaoModelService to ensure proper relationships
 * between DAOs and their proposals.
 */
@Injectable()
export class ProposalModelService {
  /**
   * Constructor for ProposalModelService
   * 
   * @param proposalModel Injected Mongoose model for Proposal document access
   * @param daoModelService Service for managing DAO models, used to validate
   *                        relationships and enforce membership rules
   */
  constructor(
    @InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>,
    private readonly daoModelService: DaoModelService
  ) {}

  /**
   * @method create
   * @description Creates a new proposal in the database
   * 
   * This method handles the creation of a new proposal, including validation of
   * the DAO membership, calculation of voting period, and establishment of
   * database relationships. It also ensures voting rules are followed.
   * 
   * @param {CreateProposalDto} createProposalDto - Data transfer object containing proposal creation parameters
   * @returns {Promise<Proposal>} The newly created proposal entity
   * 
   * @throws NotFoundException If the specified DAO does not exist
   * @throws BadRequestException If the creator is not a DAO member or voting duration is too short
   */
  async create(createProposalDto: CreateProposalDto): Promise<Proposal> {
    // Verify the DAO exists
    const dao = await this.daoModelService.findOne(createProposalDto.daoId) as DaoDocument;
    if (!dao) {
      throw new NotFoundException(`DAO with ID ${createProposalDto.daoId} not found`);
    }

    // Verify the creator is a member of the DAO
    const isMember = await this.daoModelService.isMember(createProposalDto.daoId, createProposalDto.creatorAddress);
    if (!isMember) {
      throw new BadRequestException('Creator is not a member of the DAO');
    }

    // Calculate start and end times
    const startTime = new Date();
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + createProposalDto.votingDurationHours);

    // Ensure voting duration meets minimum requirement
    if (createProposalDto.votingDurationHours < dao.votingRules.minVotingPeriod) {
      throw new BadRequestException(`Voting duration must be at least ${dao.votingRules.minVotingPeriod} hours`);
    }

    // Set voting options (use custom options if provided, otherwise use default)
    const votingOptions = createProposalDto.votingOptions && createProposalDto.votingOptions.length > 0
      ? createProposalDto.votingOptions
      : ['YES', 'NO', 'ABSTAIN'];

    // Validate that there aren't too many options
    if (votingOptions.length > 5) {
      throw new BadRequestException('A maximum of 5 voting options is allowed');
    }

    const proposalId = `prop-${randomUUID()}`;
    
    const newProposal = new this.proposalModel({
      proposalId,
      daoId: createProposalDto.daoId,
      dao: dao._id,
      title: createProposalDto.title,
      description: createProposalDto.description,
      creatorAddress: createProposalDto.creatorAddress,
      startTime,
      endTime,
      status: ProposalStatus.ACTIVE,
      proposalData: createProposalDto.proposalData,
      votingOptions,
      votes: []
    });

    const savedProposal = await newProposal.save();
    
    // Update the DAO to add this proposal to its proposals array
    await this.daoModelService.addProposal(createProposalDto.daoId, savedProposal._id.toString());
    
    return savedProposal;
  }

  /**
   * Retrieves all proposals in the system
   * 
   * This method returns all proposals stored in the database, regardless of
   * their status or associated DAO. In production systems with many proposals,
   * this method should be used with caution and potentially include pagination.
   * 
   * @returns Array of all proposal entities
   */
  async findAll(): Promise<Proposal[]> {
    return this.proposalModel.find().exec();
  }

  /**
   * Finds a specific proposal by its unique identifier
   * 
   * This method retrieves a single proposal based on its proposalId.
   * It does not populate any related entities like DAO or votes.
   * 
   * @param proposalId The unique identifier of the proposal to find
   * @returns The matching proposal entity
   * 
   * @throws NotFoundException If no proposal with the specified ID exists
   */
  async findOne(proposalId: string): Promise<Proposal> {
    const proposal = await this.proposalModel.findOne({ proposalId }).exec();
    
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${proposalId} not found`);
    }
    
    return proposal;
  }

  /**
   * Finds a proposal with all its related entities populated
   * 
   * This method retrieves a proposal and populates its related entities,
   * including the associated DAO and all votes cast on the proposal.
   * It provides a complete view of the proposal with all its relationships.
   * 
   * @param proposalId The unique identifier of the proposal to find
   * @returns The proposal with populated DAO and votes
   * 
   * @throws NotFoundException If no proposal with the specified ID exists
   */
  async findOneWithVotes(proposalId: string): Promise<Proposal> {
    const proposal = await this.proposalModel.findOne({ proposalId })
      .populate('dao')
      .populate('votes')
      .exec();
    
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${proposalId} not found`);
    }
    
    return proposal;
  }

  /**
   * Finds all proposals associated with a specific DAO
   * 
   * This method retrieves all proposals that belong to the specified DAO,
   * regardless of their status (active, expired, executed, etc.).
   * 
   * @param daoId The unique identifier of the DAO to find proposals for
   * @returns Array of proposals belonging to the specified DAO
   */
  async findByDao(daoId: string): Promise<Proposal[]> {
    return this.proposalModel.find({ daoId }).exec();
  }

  /**
   * Finds active, non-expired proposals for a specific DAO
   * 
   * This method retrieves only proposals that:
   * 1. Belong to the specified DAO
   * 2. Have an ACTIVE status
   * 3. Have not yet reached their end time (not expired)
   * 
   * This is particularly useful for displaying proposals that members
   * can still vote on.
   * 
   * @param daoId The unique identifier of the DAO to find active proposals for
   * @returns Array of active, non-expired proposals for the DAO
   */
  async findActiveByDao(daoId: string): Promise<Proposal[]> {
    return this.proposalModel.find({ 
      daoId, 
      status: ProposalStatus.ACTIVE,
      endTime: { $gt: new Date() }
    }).exec();
  }

  /**
   * Updates the status of a proposal
   * 
   * This method changes the status of a proposal (e.g., from ACTIVE to EXECUTED
   * or EXPIRED). Status transitions should follow the proper lifecycle of a proposal.
   * 
   * @param proposalId The unique identifier of the proposal to update
   * @param status The new status to set on the proposal
   * @returns The updated proposal entity
   * 
   * @throws NotFoundException If no proposal with the specified ID exists
   */
  async updateStatus(proposalId: string, status: ProposalStatus): Promise<Proposal> {
    const proposal = await this.proposalModel.findOneAndUpdate(
      { proposalId },
      { status },
      { new: true }
    ).exec();
    
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${proposalId} not found`);
    }
    
    return proposal;
  }

  /**
   * Associates a vote with a proposal
   * 
   * This method adds a vote reference to a proposal's votes array. It ensures
   * that each vote is only added once (using $addToSet). This creates the
   * relationship between proposals and their votes.
   * 
   * @param proposalId The unique identifier of the proposal
   * @param voteId MongoDB ObjectId of the vote to add
   * @returns The updated proposal with the vote added
   * 
   * @throws NotFoundException If no proposal with the specified ID exists
   */
  async addVote(proposalId: string, voteId: string): Promise<Proposal> {
    const proposal = await this.proposalModel.findOneAndUpdate(
      { proposalId },
      { $addToSet: { votes: voteId } },
      { new: true }
    ).exec();
    
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${proposalId} not found`);
    }
    
    return proposal;
  }

  /**
   * Processes expired proposals to update their status
   * 
   * This method finds all active proposals whose end time has passed
   * and updates their status to EXPIRED. It's designed to be called
   * periodically by a scheduled task or cron job to ensure proposal
   * statuses remain accurate.
   * 
   * The method doesn't return any data but updates all qualifying proposals
   * in the database.
   */
  async processExpiredProposals(): Promise<void> {
    const now = new Date();
    
    // Find expired active proposals
    const expiredProposals = await this.proposalModel.find({
      status: ProposalStatus.ACTIVE,
      endTime: { $lt: now }
    }).exec();
    
    // Update their status to EXPIRED
    for (const proposal of expiredProposals) {
      await this.updateStatus(proposal.proposalId, ProposalStatus.EXPIRED);
    }
  }
} 