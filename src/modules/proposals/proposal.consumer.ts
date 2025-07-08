/**
 * @module ProposalConsumer
 * @description Bull queue consumer for proposal background processing
 * 
 * This module provides a service for handling asynchronous background processing
 * of proposal-related operations. It uses Bull queues to manage and process jobs
 * related to proposal creation, expiration checking, and other operations that may
 * require interaction with external systems or resource-intensive processing.
 */
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { ProposalModelService } from './proposal.model.service';
import { LoggerHelper } from '@hsuite/helpers';

/**
 * @class ProposalConsumer
 * @description Processor for proposal-related background jobs
 * 
 * The ProposalConsumer class implements handlers for processing asynchronous
 * background jobs related to proposals. It processes jobs added to the 'dao'
 * queue, performing operations that may be resource-intensive or require 
 * interaction with external systems like the Hedera network.
 * 
 * Using a queue-based approach allows these operations to be retried
 * automatically on failure and ensures they don't block the main request flow.
 */
@Processor('dao')
export class ProposalConsumer {
  /**
   * @property logger
   * @description Logger instance for this consumer
   * @private
   */
  private readonly logger: LoggerHelper = new LoggerHelper(ProposalConsumer.name);

  /**
   * @constructor
   * @description Creates a new instance of ProposalConsumer
   * 
   * @param {ProposalModelService} proposalModelService - Service for proposal data operations
   */
  constructor(
    private readonly proposalModelService: ProposalModelService
  ) {}

  /**
   * @method processProposalCreation
   * @description Process a job for a newly created proposal
   * 
   * This method handles background processing for newly created proposals.
   * It is triggered by the 'process-proposal-creation' job added to the queue
   * when a new proposal is created. The method currently logs the event, but
   * in a production environment, it would typically perform actions like:
   * 
   * - Interacting with the Hedera network to register the proposal
   * - Setting up smart contract events for tracking votes
   * - Initializing proposal analytics
   * - Sending notifications to DAO members about the new proposal
   * 
   * @param {Job<{ proposalId: string, daoId: string, creatorAddress: string }>} job - The Bull job containing proposal data
   * @returns {Promise<void>}
   * 
   * @throws {Error} If processing fails, allowing Bull to retry the job
   */
  @Process('process-proposal-creation')
  async processProposalCreation(job: Job<{ proposalId: string, daoId: string, creatorAddress: string }>) {
    this.logger.debug(`Processing proposal creation job ${job.id}`);
    
    try {
      const { proposalId, daoId, creatorAddress } = job.data;
      
      // In the future, this would integrate with Hedera SDK
      // For now, we're just logging the event
      this.logger.log(`Proposal ${proposalId} created for DAO ${daoId} by ${creatorAddress}`);
      
      // Add any additional processing logic here
      
      this.logger.debug(`Completed processing proposal creation job ${job.id}`);
    } catch (error) {
      this.logger.error(`Error processing proposal creation job ${job.id}`, error.stack);
      throw error;
    }
  }

  /**
   * @method processExpiredProposals
   * @description Regularly checks and updates expired proposals
   * 
   * This method is scheduled to run periodically to identify and process
   * proposals that have reached their voting end time. It delegates to the
   * ProposalModelService to:
   * 
   * - Find all proposals with a voting end time in the past
   * - Update their status based on voting results
   * - Finalize any on-chain actions required by approved proposals
   * - Update DAO state based on the proposal outcome
   * 
   * This automated processing ensures that proposal voting periods are
   * strictly enforced and results are processed in a timely manner.
   * 
   * @param {Job} job - The Bull job for processing expired proposals
   * @returns {Promise<void>}
   * 
   * @throws {Error} If processing fails, allowing Bull to retry the job
   */
  @Process('process-expired-proposals')
  async processExpiredProposals(job: Job) {
    this.logger.debug(`Processing expired proposals job ${job.id}`);
    
    try {
      await this.proposalModelService.processExpiredProposals();
      this.logger.debug(`Completed processing expired proposals job ${job.id}`);
    } catch (error) {
      this.logger.error(`Error processing expired proposals job ${job.id}`, error.stack);
      throw error;
    }
  }
} 