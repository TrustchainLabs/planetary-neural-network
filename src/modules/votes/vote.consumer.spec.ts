/**
 * @file vote.consumer.spec.ts
 * @description Tests for the VoteConsumer class
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { VoteConsumer } from './vote.consumer';
import { VoteModelService } from './vote.model.service';
import { Logger } from '@nestjs/common';
import { VoteChoice } from './entities/vote.entity';

describe('VoteConsumer', () => {
  let consumer: VoteConsumer;
  let voteModelService: VoteModelService;

  // Mock job objects
  const mockJob = {
    id: 'job-123',
    data: {
      voteId: 'vote-123',
      proposalId: 'proposal-123',
      daoId: 'dao-123',
      voterAddress: '0x123',
      choice: VoteChoice.YES
    }
  };

  // Create a mock queue for Bull
  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    // Create a mock implementation for the VoteModelService
    const mockVoteModelService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteConsumer,
        {
          provide: VoteModelService,
          useValue: mockVoteModelService,
        },
        {
          provide: getQueueToken('dao'),
          useValue: mockQueue,
        }
      ],
    }).compile();

    consumer = module.get<VoteConsumer>(VoteConsumer);
    voteModelService = module.get<VoteModelService>(VoteModelService);

    // Spy on logger methods to avoid console output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processVoteCreation', () => {
    it('should process a vote creation job successfully', async () => {
      // Act
      await consumer.processVoteCreation(mockJob as any);

      // Assert
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Processing vote creation job ${mockJob.id}`
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Vote ${mockJob.data.voteId} cast for proposal ${mockJob.data.proposalId} in DAO ${mockJob.data.daoId} by ${mockJob.data.voterAddress}: ${mockJob.data.choice}`
      );
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Completed processing vote creation job ${mockJob.id}`
      );
    });

    it('should log and rethrow errors during vote creation processing', async () => {
      // Arrange
      const mockError = new Error('Test error');
      jest.spyOn(Logger.prototype, 'log').mockImplementationOnce(() => {
        throw mockError;
      });

      // Act & Assert
      await expect(consumer.processVoteCreation(mockJob as any)).rejects.toThrow(mockError);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Error processing vote creation job ${mockJob.id}`,
        mockError.stack
      );
    });
  });
}); 