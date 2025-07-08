/**
 * @module VoteConsumer
 * @description Processor for vote-related background jobs
 * 
 * This module provides a Bull queue consumer for processing vote-related
 * background jobs. It handles asynchronous operations related to votes,
 * such as processing newly created votes, validating vote transactions,
 * and integrating with blockchain networks when necessary.
 * 
 * Using a queue-based approach allows these operations to be processed
 * reliably, with automatic retries on failure, and without blocking
 * the main application flow.
 */
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { VoteModelService } from './vote.model.service';
import { VoteChoice } from './entities/vote.entity';
import { LoggerHelper } from '@hsuite/helpers';

/**
 * @class VoteConsumer
 * @description Processor for vote-related background jobs
 * 
 * The VoteConsumer class implements handlers for processing asynchronous
 * background jobs related to votes. It processes jobs added to the 'dao'
 * queue by the VoteService, performing operations that may be resource-intensive
 * or require interaction with external systems like the Hedera network.
 * 
 * This consumer ensures that vote processing can continue reliably even if
 * there are temporary issues with external dependencies.
 */
@Processor('dao')
export class VoteConsumer {
  /**
   * @property logger
   * @description Logger instance for this consumer
   * @private
   */
  private readonly logger: LoggerHelper = new LoggerHelper(VoteConsumer.name);

  /**
   * @constructor
   * @description Creates a new instance of VoteConsumer
   * 
   * @param {VoteModelService} voteModelService - Service for vote data operations
   */
  constructor(
    private readonly voteModelService: VoteModelService
  ) {}

  /**
   * @method processVoteCreation
   * @description Process a job for a newly created vote
   * 
   * This method handles background processing for newly created votes.
   * It is triggered by the 'process-vote-creation' job added to the queue
   * when a new vote is created. 
   * 
   * Currently, this method primarily logs the vote creation. In a production
   * environment, this would likely integrate with the Hedera network or other
   * blockchain systems to record the vote on-chain, verify transactions, or
   * perform additional operations that shouldn't block the main request flow.
   * 
   * @param {Job} job - The Bull job containing vote creation data
   * @returns {Promise<void>}
   * 
   * @throws {Error} If there is an issue processing the vote creation job
   */
  @Process('process-vote-creation')
  async processVoteCreation(job: Job<{ 
    voteId: string;
    proposalId: string;
    daoId: string;
    voterAddress: string;
    choice: VoteChoice;
  }>) {
    this.logger.debug(`Processing vote creation job ${job.id}`);
    
    try {
      const { voteId, proposalId, daoId, voterAddress, choice } = job.data;
      
      // In the future, this would integrate with Hedera SDK
      // For now, we're just logging the event
      this.logger.log(`Vote ${voteId} cast for proposal ${proposalId} in DAO ${daoId} by ${voterAddress}: ${choice}`);
      
      // Add any additional processing logic here
      
      this.logger.debug(`Completed processing vote creation job ${job.id}`);
    } catch (error) {
      this.logger.error(`Error processing vote creation job ${job.id}`, error.stack);
      throw error;
    }
  }
} 