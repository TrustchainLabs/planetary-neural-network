/**
 * @module ProposalService
 * @description Service handling proposal business logic
 * 
 * This module provides a service for managing the business logic related to
 * proposals within DAOs. It coordinates data operations, manages background
 * tasks through Bull queues, and implements the core proposal functionality
 * including creation, retrieval, and processing of expired proposals.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ProposalModelService } from './proposal.model.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { Proposal } from './entities/proposal.entity';

/**
 * @class ProposalService
 * @description Service for proposal business logic operations
 * 
 * The ProposalService implements the core business logic for proposal management
 * in the DAO system. It delegates data operations to the ProposalModelService
 * and uses Bull queues to handle background processing of proposal-related tasks.
 * 
 * This service acts as a facade between the controllers and the data layer,
 * providing a clean API for proposal operations while hiding implementation
 * details like data access and background processing.
 */
@Injectable()
export class ProposalService {
  /**
   * @constructor
   * @description Creates a new instance of ProposalService
   * 
   * @param {ProposalModelService} proposalModelService - Service for proposal data operations
   * @param {Queue} proposalQueue - Bull queue for proposal background processing
   */
  constructor(
    private readonly proposalModelService: ProposalModelService,
    @InjectQueue('dao') private readonly proposalQueue: Queue
  ) {}

  /**
   * @method create
   * @description Creates a new proposal for a DAO
   * 
   * This method handles the creation of a new proposal in a DAO. It performs
   * the following operations:
   * 1. Delegates to ProposalModelService to create the proposal in the database
   * 2. Queues a background job to perform additional processing on the new proposal
   * 
   * The background job enables asynchronous processing such as blockchain
   * interactions or notifications without blocking the API response.
   * 
   * @param {CreateProposalDto} createProposalDto - Data transfer object containing proposal creation parameters
   * @returns {Promise<Proposal>} The newly created proposal entity
   * 
   * @throws {BadRequestException} If the input data is invalid (delegated from model service)
   * @throws {NotFoundException} If the referenced DAO does not exist (delegated from model service)
   */
  async create(createProposalDto: CreateProposalDto): Promise<Proposal> {
    // Create the proposal in the database
    const proposal = await this.proposalModelService.create(createProposalDto);
    
    // Queue a job to process the proposal creation
    await this.proposalQueue.add('process-proposal-creation', {
      proposalId: proposal.proposalId,
      daoId: proposal.daoId,
      creatorAddress: proposal.creatorAddress
    }, { 
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });
    
    return proposal;
  }

  /**
   * @method findAll
   * @description Retrieves all proposals in the system
   * 
   * This method fetches all proposal entities from the database through
   * the ProposalModelService. In production environments with many proposals,
   * this method should be enhanced with pagination, filtering, and sorting
   * capabilities to prevent performance issues.
   * 
   * @returns {Promise<Proposal[]>} Array of all proposal entities
   */
  async findAll(): Promise<Proposal[]> {
    return this.proposalModelService.findAll();
  }

  /**
   * @method findOne
   * @description Retrieves a specific proposal by its ID
   * 
   * This method fetches a single proposal entity from the database based on
   * its unique identifier. It enhances the model service's findOne by adding
   * proper error handling, throwing a NotFoundException if the proposal
   * doesn't exist.
   * 
   * @param {string} proposalId - Unique identifier of the proposal to retrieve
   * @returns {Promise<Proposal>} The requested proposal entity
   * 
   * @throws {NotFoundException} If the proposal with the specified ID does not exist
   */
  async findOne(proposalId: string): Promise<Proposal> {
    const proposal = await this.proposalModelService.findOne(proposalId);
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${proposalId} not found`);
    }
    return proposal;
  }

  /**
   * @method findOneWithVotes
   * @description Retrieves a proposal with its related entities
   * 
   * This method fetches a proposal entity from the database along with its
   * associated DAO and votes entities. This provides a complete view of the
   * proposal including its context and current voting status.
   * 
   * @param {string} proposalId - Unique identifier of the proposal to retrieve
   * @returns {Promise<Proposal>} The proposal with populated relations
   * 
   * @throws {NotFoundException} If the proposal with the specified ID does not exist
   */
  async findOneWithVotes(proposalId: string): Promise<Proposal> {
    return this.proposalModelService.findOneWithVotes(proposalId);
  }

  /**
   * @method findByDao
   * @description Retrieves all proposals for a specific DAO
   * 
   * This method fetches all proposal entities from the database that are
   * associated with a particular DAO. It delegates to the model service
   * to perform the actual data retrieval.
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @returns {Promise<Proposal[]>} Array of proposals for the specified DAO
   */
  async findByDao(daoId: string): Promise<Proposal[]> {
    return this.proposalModelService.findByDao(daoId);
  }

  /**
   * @method findActiveByDao
   * @description Retrieves active proposals for a specific DAO
   * 
   * This method fetches only the active proposals for a particular DAO -
   * those that are currently open for voting. It delegates to the model service
   * to filter proposals based on their status and expiration time.
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @returns {Promise<Proposal[]>} Array of active proposals for the specified DAO
   */
  async findActiveByDao(daoId: string): Promise<Proposal[]> {
    return this.proposalModelService.findActiveByDao(daoId);
  }

  /**
   * @method processExpiredProposals
   * @description Initiates background processing of expired proposals
   * 
   * This method queues a job to process proposals that have reached their
   * voting end time. The actual processing is performed asynchronously by
   * the ProposalConsumer to avoid blocking API responses.
   * 
   * The job is configured with retry logic to ensure that processing succeeds
   * even in the face of temporary failures.
   * 
   * This method should be called by a scheduled task at regular intervals.
   * 
   * @returns {Promise<void>}
   */
  async processExpiredProposals(): Promise<void> {
    // Add a job to the queue for background processing
    await this.proposalQueue.add('process-expired-proposals', {}, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });
  }
} 