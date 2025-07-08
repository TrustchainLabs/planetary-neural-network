/**
 * @file dao.events.spec.ts
 * @description Tests for the DaoEvents class handling Bull queue events
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DaoEvents } from './dao.events';
import { Logger } from '@nestjs/common';

describe('DaoEvents', () => {
  let events: DaoEvents;
  let eventEmitter: EventEmitter2;

  // Create mock jobs and data
  const mockJob = {
    id: 'job-123',
    data: {
      daoId: 'dao-123',
      ownerAddress: '0x123'
    },
    name: 'process-dao-creation',
    attemptsMade: 1,
    failedReason: 'test failure reason',
    stacktrace: ['error stack line 1', 'error stack line 2'],
    timestamp: Date.now(),
    processedOn: Date.now(),
    finishedOn: Date.now(),
  };

  // Create a mock queue
  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
    getJobCounts: jest.fn().mockResolvedValue({
      active: 1,
      completed: 5,
      failed: 0,
      delayed: 2,
      waiting: 3
    }),
  };

  beforeEach(async () => {
    // Create a mock implementation of the EventEmitter
    const mockEventEmitter = {
      emit: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DaoEvents,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: getQueueToken('dao'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    events = module.get<DaoEvents>(DaoEvents);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Spy on logger methods to avoid console output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should log initialization message', async () => {
      // Act
      await events.onModuleInit();

      // Assert
      expect(Logger.prototype.log).toHaveBeenCalledWith('Dao events initialized');
    });
  });

  describe('OnQueueProgress', () => {
    it('should log job progress and emit event', () => {
      // Arrange
      const progress = 50;

      // Act
      events.OnQueueProgress(mockJob as any, progress);

      // Assert
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Job ${mockJob.id} of type ${mockJob.name} reported progress: ${progress}%`
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dao.job.progress',
        expect.any(Object)
      );
    });
  });

  describe('OnQueueActive', () => {
    it('should log when a job becomes active and emit event', () => {
      // Act
      events.OnQueueActive(mockJob as any);

      // Assert
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Processing job ${mockJob.id}`)
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dao.job.active',
        expect.objectContaining({
          jobId: mockJob.id,
          name: mockJob.name,
          data: mockJob.data,
        })
      );
    });
  });

  describe('OnQueueError', () => {
    it('should log queue errors', () => {
      // Arrange
      const error = new Error('Queue error');

      // Act
      events.OnQueueError(error);

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Queue processing error',
        error.stack
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dao.queue.error',
        expect.any(Object)
      );
    });
  });

  describe('OnQueueWaiting', () => {
    it('should log when a job is waiting and emit event', async () => {
      // Act
      await events.OnQueueWaiting(mockJob.id);

      // Assert
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Job ${mockJob.id} is waiting to be processed`
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dao.job.waiting',
        expect.any(Object)
      );
    });
  });

  describe('OnQueueCompleted', () => {
    it('should log when a job completes and emit event', async () => {
      // Arrange
      const result = { status: 'success', data: { daoId: 'dao-123' } };

      // Act
      await events.OnQueueCompleted(mockJob as any, result);

      // Assert
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Job ${mockJob.id} of type ${mockJob.name} completed. Result: ${JSON.stringify(result)}`
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dao.job.completed',
        expect.any(Object)
      );
    });
  });

  describe('OnQueueFailed', () => {
    it('should log when a job fails and emit event', async () => {
      // Arrange
      const error = new Error('Job failed');

      // Act
      await events.OnQueueFailed(mockJob as any, error);

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Job ${mockJob.id} of type ${mockJob.name} failed. Error: ${error.message}`,
        error.stack
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dao.job.failed',
        expect.any(Object)
      );
    });
  });

  // Additional tests for the remaining event handlers
  describe('OnQueuePaused', () => {
    it('should log when the queue is paused and emit event', async () => {
      // Act
      await events.OnQueuePaused();

      // Assert
      expect(Logger.prototype.warn).toHaveBeenCalledWith('Queue paused');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dao.queue.paused',
        expect.any(Object)
      );
    });
  });

  describe('OnQueueResumed', () => {
    it('should log when the queue is resumed and emit event', async () => {
      // Act
      await events.OnQueueResumed(mockJob as any);

      // Assert
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Queue resumed. Job ${mockJob.id}`
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dao.queue.resumed',
        expect.any(Object)
      );
    });

    it('should handle undefined job when queue is resumed', async () => {
      // Act
      await events.OnQueueResumed(undefined);

      // Assert
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Queue resumed. Job unknown'
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dao.queue.resumed',
        expect.objectContaining({
          jobId: undefined,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('OnQueueCleaned', () => {
    it('should log when the queue is cleaned and emit event', async () => {
      // Arrange
      const jobs = [mockJob, mockJob] as any[];
      const type = 'completed';

      // Act
      await events.OnQueueCleaned(jobs, type);

      // Assert
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Queue cleaned. ${jobs.length} ${type} jobs removed`
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dao.queue.cleaned',
        expect.any(Object)
      );
    });
  });

  describe('OnQueueDrained', () => {
    it('should log when the queue is drained and emit event', async () => {
      // Act
      await events.OnQueueDrained();

      // Assert
      expect(Logger.prototype.log).toHaveBeenCalledWith('Queue drained');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dao.queue.drained',
        expect.any(Object)
      );
    });
  });

  describe('OnQueueRemoved', () => {
    it('should log when a job is removed and emit event', async () => {
      // Act
      await events.OnQueueRemoved(mockJob as any);

      // Assert
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Job ${mockJob.id} of type ${mockJob.name} removed from queue`
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dao.job.removed',
        expect.any(Object)
      );
    });
  });
}); 