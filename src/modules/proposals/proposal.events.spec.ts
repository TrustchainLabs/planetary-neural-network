/**
 * @file proposal.events.spec.ts
 * @description Tests for the ProposalEvents class handling Bull queue events
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProposalEvents } from './proposal.events';
import { Logger } from '@nestjs/common';

describe('ProposalEvents', () => {
  let events: ProposalEvents;
  let eventEmitter: EventEmitter2;

  // Create mock jobs and data
  const mockJob = {
    id: 'job-123',
    data: {
      proposalId: 'proposal-123',
      daoId: 'dao-123'
    },
    name: 'process-proposal-creation',
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
        ProposalEvents,
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

    events = module.get<ProposalEvents>(ProposalEvents);
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
      expect(Logger.prototype.log).toHaveBeenCalledWith('Proposal events initialized');
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
        'proposal.job.progress',
        expect.any(Object)
      );
    });

    it('should not process job when name does not start with process-proposal', () => {
      // Arrange
      const progress = 50;
      const nonProposalJob = {
        ...mockJob,
        name: 'unrelated-job'
      };

      // Act
      events.OnQueueProgress(nonProposalJob as any, progress);

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
        'proposal.job.active',
        expect.any(Object)
      );
    });

    it('should not process job when name does not start with process-proposal', () => {
      // Arrange
      const nonProposalJob = {
        ...mockJob,
        name: 'unrelated-job'
      };

      // Act
      events.OnQueueActive(nonProposalJob as any);

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
        'proposal.queue.error',
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
        'proposal.job.waiting',
        expect.any(Object)
      );
    });
  });

  describe('OnQueueCompleted', () => {
    it('should log when a job completes and emit event', async () => {
      // Arrange
      const result = { status: 'success', data: { proposalId: 'proposal-123' } };

      // Act
      await events.OnQueueCompleted(mockJob as any, result);

      // Assert
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Job ${mockJob.id} of type ${mockJob.name} completed. Result: ${JSON.stringify(result)}`
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'proposal.job.completed',
        expect.any(Object)
      );
    });

    it('should not process job when name does not start with process-proposal', async () => {
      // Arrange
      const result = { status: 'success' };
      const nonProposalJob = {
        ...mockJob,
        name: 'unrelated-job'
      };

      // Act
      await events.OnQueueCompleted(nonProposalJob as any, result);

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
        'proposal.job.failed',
        expect.any(Object)
      );
    });

    it('should not process job when name does not start with process-proposal', async () => {
      // Arrange
      const error = new Error('Job failed');
      const nonProposalJob = {
        ...mockJob,
        name: 'unrelated-job'
      };

      // Act
      await events.OnQueueFailed(nonProposalJob as any, error);

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
        'proposal.queue.paused',
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
        'proposal.queue.resumed',
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
        'proposal.queue.resumed',
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
        'proposal.queue.cleaned',
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
        'proposal.queue.drained',
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
        'proposal.job.removed',
        expect.any(Object)
      );
    });

    it('should not process job when name does not start with process-proposal', async () => {
      // Arrange
      const nonProposalJob = {
        ...mockJob,
        name: 'unrelated-job'
      };

      // Clear previous calls
      jest.clearAllMocks();

      // Act
      await events.OnQueueRemoved(nonProposalJob as any);

      // Assert
      expect(Logger.prototype.log).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
}); 