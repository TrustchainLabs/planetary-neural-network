/**
 * @file vote.events.spec.ts
 * @description Tests for the VoteEvents class handling Bull queue events
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VoteEvents } from './vote.events';
import { Logger } from '@nestjs/common';
import { VoteChoice } from './entities/vote.entity';

describe('VoteEvents', () => {
  let events: VoteEvents;
  let eventEmitter: EventEmitter2;

  // Create mock jobs and data
  const mockJob = {
    id: 'job-123',
    data: {
      voteId: 'vote-123',
      proposalId: 'proposal-123',
      daoId: 'dao-123',
      voterAddress: '0x123',
      choice: VoteChoice.YES
    },
    name: 'process-vote-creation',
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
        VoteEvents,
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

    events = module.get<VoteEvents>(VoteEvents);
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
      expect(Logger.prototype.log).toHaveBeenCalledWith('Vote events initialized');
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
        'vote.job.progress',
        expect.any(Object)
      );
    });

    it('should not process job when name does not start with process-vote', () => {
      // Arrange
      const progress = 50;
      const nonVoteJob = {
        ...mockJob,
        name: 'unrelated-job'
      };

      // Act
      events.OnQueueProgress(nonVoteJob as any, progress);

      // Assert
      expect(Logger.prototype.debug).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('OnQueueActive', () => {
    it('should log when a job becomes active and emit event', () => {
      // Act
      events.OnQueueActive(mockJob as any);

      // Assert
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Processing job ${mockJob.id} of type ${mockJob.name}`)
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'vote.job.active',
        expect.any(Object)
      );
    });

    it('should not process job when name does not start with process-vote', () => {
      // Arrange
      const nonVoteJob = {
        ...mockJob,
        name: 'unrelated-job'
      };

      // Act
      events.OnQueueActive(nonVoteJob as any);

      // Assert
      expect(Logger.prototype.debug).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
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
        'vote.queue.error',
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
        'vote.job.waiting',
        expect.any(Object)
      );
    });
  });

  describe('OnQueueCompleted', () => {
    it('should log when a job completes and emit event', async () => {
      // Arrange
      const result = { status: 'success', data: { voteId: 'vote-123' } };

      // Act
      await events.OnQueueCompleted(mockJob as any, result);

      // Assert
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Job ${mockJob.id} of type ${mockJob.name} completed. Result: ${JSON.stringify(result)}`
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'vote.job.completed',
        expect.any(Object)
      );
    });

    it('should not process job when name does not start with process-vote', async () => {
      // Arrange
      const result = { status: 'success' };
      const nonVoteJob = {
        ...mockJob,
        name: 'unrelated-job'
      };

      // Act
      await events.OnQueueCompleted(nonVoteJob as any, result);

      // Assert
      expect(Logger.prototype.debug).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
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
        'vote.job.failed',
        expect.any(Object)
      );
    });

    it('should not process job when name does not start with process-vote', async () => {
      // Arrange
      const error = new Error('Job failed');
      const nonVoteJob = {
        ...mockJob,
        name: 'unrelated-job'
      };

      // Act
      await events.OnQueueFailed(nonVoteJob as any, error);

      // Assert
      expect(Logger.prototype.error).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
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
        'vote.queue.paused',
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
        'vote.queue.resumed',
        expect.any(Object)
      );
    });

    it('should handle null job when the queue is resumed', async () => {
      // Act
      await events.OnQueueResumed(null);

      // Assert
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Queue resumed. Job unknown'
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'vote.queue.resumed',
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
        'vote.queue.cleaned',
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
        'vote.queue.drained',
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
        'vote.job.removed',
        expect.any(Object)
      );
    });

    it('should not process job when name does not start with process-vote', async () => {
      // Arrange
      const nonVoteJob = {
        ...mockJob,
        name: 'unrelated-job'
      };
      
      // Clear previous calls before testing
      jest.clearAllMocks();

      // Act
      await events.OnQueueRemoved(nonVoteJob as any);

      // Assert
      expect(Logger.prototype.log).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
}); 