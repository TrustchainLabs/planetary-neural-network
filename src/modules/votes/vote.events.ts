/**
 * @module VoteEvents
 * @description Event processor for vote-related Bull queue events
 * 
 * This module provides event handlers for Bull queue events related to vote
 * processing. It monitors and logs queue activity for vote jobs, and emits
 * events to notify other parts of the application about job progress and status changes.
 * 
 * The events emitted by this module can be used for:
 * - Real-time updates to clients about vote status changes
 * - Monitoring and logging of vote processing activities
 * - Triggering additional business logic when vote operations complete
 * - Alerting on failures in the vote processing pipeline
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
 * @class VoteEvents
 * @description Event handler for vote-related Bull queue events
 * 
 * The VoteEvents class implements handlers for Bull queue events related to
 * vote processing. It listens for events such as job progress, completion,
 * failure, and queue status changes, logs these events, and emits application
 * events to notify other components.
 * 
 * By centralizing queue event handling, this class provides consistent logging
 * and notification for all vote-related background processing activities.
 */
@Processor('dao')
export class VoteEvents implements OnModuleInit {
  /**
   * @property {LoggerHelper} logger - Logger instance for this service
   * @private
   */
  private logger: LoggerHelper = new LoggerHelper(VoteEvents.name);

  /**
   * @constructor
   * @description Creates a new instance of VoteEvents
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
   * This method logs that the vote events system has been initialized successfully.
   * It runs when the NestJS module containing this service is initialized.
   * 
   * @returns {Promise<void>}
   */
  async onModuleInit() {
    this.logger.log('Vote events initialized');
  }

  /**
   * @method OnQueueProgress
   * @description Handles events when a job reports progress
   * 
   * This method logs the progress of vote-related jobs and emits an event
   * with the job information and progress percentage. It filters to only handle
   * jobs that are related to votes.
   * 
   * @param {Job} job - The job that reported progress
   * @param {number} progress - The progress percentage (0-100)
   */
  @OnQueueProgress()
  OnQueueProgress(job: Job, progress: number) {
    // Only handle vote-related jobs
    if (!job.name.startsWith('process-vote')) return;

    this.logger.debug(
      `Job ${job.id} of type ${job.name} reported progress: ${progress}%`
    );
    this.eventEmitter.emit('vote.job.progress', {
      jobId: job.id,
      name: job.name,
      progress
    });
  }

  /**
   * @method OnQueueActive
   * @description Handles events when a job starts processing
   * 
   * This method logs when a vote-related job begins active processing and
   * emits an event with the job details. This can be used to track when
   * background operations for votes start executing.
   * 
   * @param {Job} job - The job that became active
   */
  @OnQueueActive()
  OnQueueActive(job: Job) {
    // Only handle vote-related jobs
    if (!job.name.startsWith('process-vote')) return;

    this.logger.debug(
      `Processing job ${job.id} of type ${job.name}. Data: ${JSON.stringify(
        job.data
      )}`
    );
    this.eventEmitter.emit('vote.job.active', {
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
    this.eventEmitter.emit('vote.queue.error', {
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
    this.eventEmitter.emit('vote.job.waiting', {
      jobId
    });
  }

  /**
   * @method OnQueueCompleted
   * @description Handles events when a job is successfully completed
   * 
   * This method logs the successful completion of vote-related jobs and
   * emits an event with the job details and result. This can trigger follow-up
   * actions in other parts of the application, such as updating proposal vote counts.
   * 
   * @param {Job} job - The completed job
   * @param {any} result - The result returned by the job handler
   */
  @OnQueueCompleted()
  async OnQueueCompleted(job: Job, result: any) {
    // Only handle vote-related jobs
    if (!job.name.startsWith('process-vote')) return;

    this.logger.debug(
      `Job ${job.id} of type ${job.name} completed. Result: ${JSON.stringify(result)}`
    );
    this.eventEmitter.emit('vote.job.completed', {
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
   * This method logs failures of vote-related jobs and emits an event with
   * the job details and error information. This can be used for alerting and 
   * error tracking systems to identify issues with vote processing.
   * 
   * @param {Job} job - The failed job
   * @param {Error} err - The error that caused the failure
   */
  @OnQueueFailed()
  async OnQueueFailed(job: Job, err: Error) {
    // Only handle vote-related jobs
    if (!job.name.startsWith('process-vote')) return;

    this.logger.error(
      `Job ${job.id} of type ${job.name} failed. Error: ${err.message}`,
      err.stack
    );
    this.eventEmitter.emit('vote.job.failed', {
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
   * until it is resumed, which can affect vote processing.
   */
  @OnQueuePaused()
  async OnQueuePaused() {
    this.logger.warn('Queue paused');
    this.eventEmitter.emit('vote.queue.paused', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * @method OnQueueResumed
   * @description Handles events when the queue is resumed
   * 
   * This method logs when the queue leaves the paused state and resumes
   * processing jobs. It emits an event with the job ID (if available) and
   * timestamp, which can be used to monitor queue health.
   * 
   * @param {Job} job - The job that was being processed when the queue resumed
   */
  @OnQueueResumed()
  async OnQueueResumed(job: Job) {
    this.logger.log(
      `Queue resumed. Job ${job?.id || 'unknown'}`
    );
    this.eventEmitter.emit('vote.queue.resumed', {
      jobId: job?.id,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * @method OnQueueCleaned
   * @description Handles events when jobs are cleaned from the queue
   * 
   * This method logs when old jobs are removed from the queue during cleanup
   * operations. It emits an event with the count and type of jobs removed,
   * which can be useful for system maintenance monitoring.
   * 
   * @param {Job[]} jobs - The cleaned jobs
   * @param {string} type - The type of jobs that were cleaned (completed, failed)
   */
  @OnQueueCleaned()
  async OnQueueCleaned(jobs: Job[], type: string) {
    this.logger.log(
      `Queue cleaned. ${jobs.length} ${type} jobs removed`
    );
    this.eventEmitter.emit('vote.queue.cleaned', {
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
    this.eventEmitter.emit('vote.queue.drained', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * @method OnQueueRemoved
   * @description Handles events when a job is removed from the queue
   * 
   * This method logs when a vote-related job is manually removed from
   * the queue. It emits an event with the job details and timestamp,
   * which can be useful for audit trails and monitoring.
   * 
   * @param {Job} job - The removed job
   */
  @OnQueueRemoved()
  async OnQueueRemoved(job: Job) {
    // Only handle vote-related jobs
    if (!job.name.startsWith('process-vote')) return;

    this.logger.log(
      `Job ${job.id} of type ${job.name} removed from queue`
    );
    this.eventEmitter.emit('vote.job.removed', {
      jobId: job.id,
      name: job.name,
      timestamp: new Date().toISOString()
    });
  }
} 