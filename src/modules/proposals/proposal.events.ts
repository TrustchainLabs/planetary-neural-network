/**
 * @module ProposalEvents
 * @description Event processor for proposal-related Bull queue events
 * 
 * This module provides event handlers for Bull queue events related to proposal
 * processing. It monitors and logs queue activity for proposal jobs, and emits
 * events to notify other parts of the application about job progress and status changes.
 * 
 * The events emitted by this module can be used for:
 * - Real-time updates to clients about proposal status changes
 * - Monitoring and logging of proposal processing activities
 * - Triggering additional business logic when proposal operations complete
 * - Alerting on failures in the proposal processing pipeline
 */
import { 
  Processor, 
  OnQueueActive, 
  OnQueueError, 
  OnQueueWaiting, 
  OnQueueCompleted,
  OnQueueFailed,
  OnQueuePaused,
  OnQueueResumed,
  OnQueueCleaned,
  OnQueueDrained,
  OnQueueRemoved,
  OnQueueProgress
} from '@nestjs/bull';
import { OnModuleInit } from '@nestjs/common';
import { Job } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerHelper } from '@hsuite/helpers';

/**
 * @class ProposalEvents
 * @description Event handler for proposal-related Bull queue events
 * 
 * The ProposalEvents class implements handlers for Bull queue events related to
 * proposal processing. It listens for events such as job progress, completion,
 * failure, and queue status changes, logs these events, and emits application
 * events to notify other components.
 * 
 * By centralizing queue event handling, this class provides consistent logging
 * and notification for all proposal-related background processing activities.
 */
@Processor('dao')
export class ProposalEvents implements OnModuleInit {
  /**
   * @property {LoggerHelper} logger - Logger instance for this service
   * @private
   */
  private logger: LoggerHelper = new LoggerHelper(ProposalEvents.name);

  /**
   * @constructor
   * @description Creates a new instance of ProposalEvents
   * 
   * @param {EventEmitter2} eventEmitter - Event emitter for broadcasting events to the application
   */
  constructor(
    private eventEmitter: EventEmitter2
  ) {}

  /**
   * @method onModuleInit
   * @description Lifecycle hook that is called once the module has been initialized
   * 
   * This method logs that the proposal events system has been initialized successfully.
   * It runs when the NestJS module containing this service is initialized.
   * 
   * @returns {Promise<void>}
   */
  async onModuleInit() {
    this.logger.log('Proposal events initialized');
  }

  /**
   * @method OnQueueProgress
   * @description Handles events when a job reports progress
   * 
   * This method logs the progress of proposal-related jobs and emits an event
   * with the job information and progress percentage. It filters to only handle
   * jobs that are related to proposals.
   * 
   * @param {Job} job - The job that reported progress
   * @param {number} progress - The progress percentage (0-100)
   */
  @OnQueueProgress()
  OnQueueProgress(job: Job, progress: number) {
    // Only handle proposal-related jobs
    if (!job.name.startsWith('process-proposal')) return;

    this.logger.debug(
      `Job ${job.id} of type ${job.name} reported progress: ${progress}%`
    );
    this.eventEmitter.emit('proposal.job.progress', {
      jobId: job.id,
      name: job.name,
      progress
    });
  }

  /**
   * @method OnQueueActive
   * @description Handles events when a job starts processing
   * 
   * This method logs when a proposal-related job begins active processing and
   * emits an event with the job details. This can be used to track when
   * background operations for proposals start executing.
   * 
   * @param {Job} job - The job that became active
   */
  @OnQueueActive()
  OnQueueActive(job: Job) {
    // Only handle proposal-related jobs
    if (!job.name.startsWith('process-proposal')) return;

    this.logger.debug(
      `Processing job ${job.id} of type ${job.name}. Data: ${JSON.stringify(
        job.data
      )}`
    );
    this.eventEmitter.emit('proposal.job.active', {
      jobId: job.id,
      name: job.name,
      data: job.data
    });
  }

  /**
   * @method OnQueueError
   * @description Handles events when a queue error occurs
   * 
   * This method logs errors that occur at the queue level (not specific to 
   * individual jobs) and emits an event with the error details. These are
   * typically serious errors that affect the queue's ability to function.
   * 
   * @param {Error} error - The error object from the queue
   */
  @OnQueueError()
  OnQueueError(error: Error) {
    this.logger.error(
      'Queue processing error',
      error.stack
    );
    this.eventEmitter.emit('proposal.queue.error', {
      error: error.message,
      stack: error.stack
    });
  }

  /**
   * @method OnQueueWaiting
   * @description Handles events when a job is waiting to be processed
   * 
   * This method logs when a job enters the waiting state in the queue and
   * emits an event with the job ID. This indicates that the job has been
   * added to the queue but processing has not yet begun.
   * 
   * @param {number|string} jobId - The ID of the waiting job
   */
  @OnQueueWaiting()
  async OnQueueWaiting(jobId: number | string) {
    this.logger.debug(
      `Job ${jobId} is waiting to be processed`
    );
    this.eventEmitter.emit('proposal.job.waiting', {
      jobId
    });
  }

  /**
   * @method OnQueueCompleted
   * @description Handles events when a job is successfully completed
   * 
   * This method logs the successful completion of proposal-related jobs and
   * emits an event with the job details and result. This can trigger follow-up
   * actions in other parts of the application.
   * 
   * @param {Job} job - The completed job
   * @param {any} result - The result returned by the job handler
   */
  @OnQueueCompleted()
  async OnQueueCompleted(job: Job, result: any) {
    // Only handle proposal-related jobs
    if (!job.name.startsWith('process-proposal')) return;

    this.logger.debug(
      `Job ${job.id} of type ${job.name} completed. Result: ${JSON.stringify(result)}`
    );
    this.eventEmitter.emit('proposal.job.completed', {
      jobId: job.id,
      name: job.name,
      data: job.data,
      result
    });
  }

  /**
   * @method OnQueueFailed
   * @description Handles events when a job fails
   * 
   * This method logs failures of proposal-related jobs and emits an event with
   * the job details and error information. This can be used for alerting and 
   * error tracking systems.
   * 
   * @param {Job} job - The failed job
   * @param {Error} err - The error that caused the failure
   */
  @OnQueueFailed()
  async OnQueueFailed(job: Job, err: Error) {
    // Only handle proposal-related jobs
    if (!job.name.startsWith('process-proposal')) return;

    this.logger.error(
      `Job ${job.id} of type ${job.name} failed. Error: ${err.message}`,
      err.stack
    );
    this.eventEmitter.emit('proposal.job.failed', {
      jobId: job.id,
      name: job.name,
      data: job.data,
      error: err.message,
      stack: err.stack
    });
  }

  /**
   * @method OnQueuePaused
   * @description Handles events when the queue is paused
   * 
   * This method logs when the queue enters a paused state and emits an event
   * with the timestamp. When the queue is paused, no new jobs will be processed
   * until it is resumed.
   */
  @OnQueuePaused()
  async OnQueuePaused() {
    this.logger.warn('Queue paused');
    this.eventEmitter.emit('proposal.queue.paused', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * @method OnQueueResumed
   * @description Handles events when the queue is resumed
   * 
   * This method logs when the queue leaves the paused state and resumes
   * processing jobs. It emits an event with the job ID (if available) and
   * timestamp.
   * 
   * @param {Job} job - The job that was being processed when the queue resumed
   */
  @OnQueueResumed()
  async OnQueueResumed(job: Job) {
    this.logger.log(
      `Queue resumed. Job ${job?.id || 'unknown'}`
    );
    this.eventEmitter.emit('proposal.queue.resumed', {
      jobId: job?.id,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * @method OnQueueCleaned
   * @description Handles events when jobs are cleaned from the queue
   * 
   * This method logs when old jobs are removed from the queue during cleanup
   * operations. It emits an event with the count and type of jobs removed.
   * 
   * @param {Job[]} jobs - The cleaned jobs
   * @param {string} type - The type of jobs that were cleaned (completed, failed)
   */
  @OnQueueCleaned()
  async OnQueueCleaned(jobs: Job[], type: string) {
    this.logger.log(
      `Queue cleaned. ${jobs.length} ${type} jobs removed`
    );
    this.eventEmitter.emit('proposal.queue.cleaned', {
      count: jobs.length,
      type,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * @method OnQueueDrained
   * @description Handles events when the queue is drained
   * 
   * This method logs when the queue becomes empty (all jobs processed).
   * It emits an event with the timestamp, which can be used to trigger
   * maintenance tasks or metrics reporting.
   */
  @OnQueueDrained()
  async OnQueueDrained() {
    this.logger.log('Queue drained');
    this.eventEmitter.emit('proposal.queue.drained', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * @method OnQueueRemoved
   * @description Handles events when a job is removed from the queue
   * 
   * This method logs when a proposal-related job is manually removed from
   * the queue. It emits an event with the job details and timestamp.
   * 
   * @param {Job} job - The removed job
   */
  @OnQueueRemoved()
  async OnQueueRemoved(job: Job) {
    // Only handle proposal-related jobs
    if (!job.name.startsWith('process-proposal')) return;

    this.logger.log(
      `Job ${job.id} of type ${job.name} removed from queue`
    );
    this.eventEmitter.emit('proposal.job.removed', {
      jobId: job.id,
      name: job.name,
      timestamp: new Date().toISOString()
    });
  }
} 