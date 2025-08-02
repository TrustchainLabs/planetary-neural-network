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
 * DAO Event Processor Module
 * 
 * This module handles the event lifecycle for all DAO-related Bull queue operations.
 * It is responsible for monitoring and reporting the status of background jobs related to DAO
 * operations such as creation, updates, and member management.
 * 
 * The module uses NestJS Bull queue event decorators to hook into various lifecycle events
 * and broadcasts these events to other parts of the application using the EventEmitter2.
 * 
 * Events are used for:
 * - Monitoring job progress and status
 * - Logging job execution details
 * - Enabling reactive programming patterns across the application
 * - Providing real-time updates to clients via WebSockets
 */

/**
 * DaoEvents class
 * 
 * A Bull queue processor that handles all event lifecycle hooks for the DAO queue.
 * This class listens for events that occur during the processing of DAO-related
 * background jobs and broadcasts them to other parts of the application.
 * 
 * It implements comprehensive logging for all queue events, making it easier to
 * trace and debug issues with background processing, as well as monitor the
 * health and performance of the queue system.
 * 
 * @usageNotes
 * This class doesn't need to be instantiated directly as it's handled by the NestJS
 * dependency injection system and the Bull queue module.
 */
@Processor('dao')
export class DaoEvents implements OnModuleInit {
  /**
   * @property {LoggerHelper} logger - Logger instance for this service
   * @private
   */
  private logger: LoggerHelper = new LoggerHelper(DaoEvents.name);

  /**
   * Constructor for DaoEvents
   * 
   * @param eventEmitter EventEmitter2 instance used to broadcast events to other
   * parts of the application, enabling reactive programming patterns
   */
  constructor(
    private eventEmitter: EventEmitter2
  ) {}

  /**
   * Lifecycle hook that is called once the module has been initialized
   * 
   * Logs the initialization of the DAO events processor, confirming
   * that the service is ready to process queue events.
   */
  async onModuleInit() {
    this.logger.log('Dao events initialized');
  }

  /**
   * Handles job progress reports
   * 
   * Called when a job in the DAO queue reports progress during execution.
   * Logs the progress and broadcasts a 'dao.job.progress' event that can be
   * used to update UI components or notify other services.
   * 
   * @param job The job reporting progress
   * @param progress The progress percentage (0-100)
   */
  @OnQueueProgress()
  OnQueueProgress(job: Job, progress: number) {
    this.logger.debug(
      `Job ${job.id} of type ${job.name} reported progress: ${progress}%`
    );
    this.eventEmitter.emit('dao.job.progress', {
      jobId: job.id,
      name: job.name,
      progress
    });
  }

  /**
   * Handles job activation
   * 
   * Called when a job starts being processed by a worker from the DAO queue.
   * Logs the start of processing and broadcasts a 'dao.job.active' event.
   * 
   * @param job The job that has started processing
   */
  @OnQueueActive()
  OnQueueActive(job: Job) {
    this.logger.debug(
      `Processing job ${job.id} of type ${job.name}. Data: ${JSON.stringify(
        job.data
      )}`
    );
    this.eventEmitter.emit('dao.job.active', {
      jobId: job.id,
      name: job.name,
      data: job.data
    });
  }

  /**
   * Handles queue errors
   * 
   * Called when a general error occurs in the queue, not related to a specific job.
   * Logs the error and broadcasts a 'dao.queue.error' event to notify monitoring systems.
   * 
   * @param error The error object representing the queue error
   */
  @OnQueueError()
  OnQueueError(error: Error) {
    this.logger.error(
      'Queue processing error',
      error.stack
    );
    this.eventEmitter.emit('dao.queue.error', {
      error: error.message,
      stack: error.stack
    });
  }

  /**
   * Handles job waiting state
   * 
   * Called when a job is added to the waiting list of the DAO queue.
   * Logs that the job is waiting and broadcasts a 'dao.job.waiting' event.
   * 
   * @param jobId The ID of the job that has entered the waiting state
   */
  @OnQueueWaiting()
  async OnQueueWaiting(jobId: number | string) {
    this.logger.debug(
      `Job ${jobId} is waiting to be processed`
    );
    this.eventEmitter.emit('dao.job.waiting', {
      jobId
    });
  }

  /**
   * Handles job completion
   * 
   * Called when a job is successfully completed in the DAO queue.
   * Logs the successful completion and broadcasts a 'dao.job.completed' event
   * with the job result, which can be used to update UI or trigger dependent processes.
   * 
   * @param job The job that was completed
   * @param result The result data returned by the completed job
   */
  @OnQueueCompleted()
  async OnQueueCompleted(job: Job, result: any) {
    this.logger.debug(
      `Job ${job.id} of type ${job.name} completed. Result: ${JSON.stringify(result)}`
    );
    this.eventEmitter.emit('dao.job.completed', {
      jobId: job.id,
      name: job.name,
      data: job.data,
      result
    });
  }

  /**
   * Handles job failures
   * 
   * Called when a job in the DAO queue fails due to an error.
   * Logs the error details and broadcasts a 'dao.job.failed' event
   * that can be used to trigger alerts or recovery mechanisms.
   * 
   * @param job The job that failed
   * @param err The error that caused the job to fail
   */
  @OnQueueFailed()
  async OnQueueFailed(job: Job, err: Error) {
    this.logger.error(
      `Job ${job.id} of type ${job.name} failed. Error: ${err.message}`,
      err.stack
    );
    this.eventEmitter.emit('dao.job.failed', {
      jobId: job.id,
      name: job.name,
      data: job.data,
      error: err.message,
      stack: err.stack
    });
  }

  /**
   * Handles queue pause events
   * 
   * Called when the DAO queue is paused, temporarily halting processing of new jobs.
   * Logs the pause event and broadcasts a 'dao.queue.paused' event that can be
   * used to update system status indicators.
   */
  @OnQueuePaused()
  async OnQueuePaused() {
    this.logger.warn('Queue paused');
    this.eventEmitter.emit('dao.queue.paused', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handles queue resume events
   * 
   * Called when the DAO queue is resumed after being paused.
   * Logs the resume event and broadcasts a 'dao.queue.resumed' event.
   * 
   * @param job The job being processed when the queue was resumed (may be undefined)
   */
  @OnQueueResumed()
  async OnQueueResumed(job: Job) {
    this.logger.log(
      `Queue resumed. Job ${job?.id || 'unknown'}`
    );
    this.eventEmitter.emit('dao.queue.resumed', {
      jobId: job?.id,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handles queue cleanup events
   * 
   * Called when jobs are removed from the DAO queue during cleanup operations.
   * Logs the cleanup details and broadcasts a 'dao.queue.cleaned' event.
   * 
   * @param jobs Array of jobs that were removed from the queue
   * @param type The type of jobs that were removed (e.g., 'completed', 'failed')
   */
  @OnQueueCleaned()
  async OnQueueCleaned(jobs: Job[], type: string) {
    this.logger.log(
      `Queue cleaned. ${jobs.length} ${type} jobs removed`
    );
    this.eventEmitter.emit('dao.queue.cleaned', {
      count: jobs.length,
      type,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handles queue drain events
   * 
   * Called when the DAO queue becomes empty (all jobs processed).
   * Logs the drain event and broadcasts a 'dao.queue.drained' event that
   * can be used to trigger maintenance tasks or scaling operations.
   */
  @OnQueueDrained()
  async OnQueueDrained() {
    this.logger.log('Queue drained');
    this.eventEmitter.emit('dao.queue.drained', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handles job removal events
   * 
   * Called when a job is manually removed from the DAO queue.
   * Logs the removal and broadcasts a 'dao.job.removed' event.
   * 
   * @param job The job that was removed from the queue
   */
  @OnQueueRemoved()
  async OnQueueRemoved(job: Job) {
    this.logger.log(
      `Job ${job.id} of type ${job.name} removed from queue`
    );
    this.eventEmitter.emit('dao.job.removed', {
      jobId: job.id,
      name: job.name,
      timestamp: new Date().toISOString()
    });
  }
} 