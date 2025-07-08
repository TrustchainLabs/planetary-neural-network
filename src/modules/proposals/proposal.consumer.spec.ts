/**
 * @file proposal.consumer.spec.ts
 * @description Tests for the ProposalConsumer class
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ProposalConsumer } from './proposal.consumer';
import { ProposalModelService } from './proposal.model.service';
import { Logger } from '@nestjs/common';

describe('ProposalConsumer', () => {
  let consumer: ProposalConsumer;
  let proposalModelService: ProposalModelService;

  // Mock job objects
  const mockJob = {
    id: 'job-123',
    data: {
      proposalId: 'proposal-123',
      daoId: 'dao-123',
      creatorAddress: '0x123'
    }
  };

  const mockExpiredProposalsJob = {
    id: 'job-456'
  };

  // Create a mock queue for Bull
  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    // Create a mock implementation for the ProposalModelService
    const mockProposalModelService = {
      processExpiredProposals: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalConsumer,
        {
          provide: ProposalModelService,
          useValue: mockProposalModelService,
        },
        {
          provide: getQueueToken('dao'),
          useValue: mockQueue,
        }
      ],
    }).compile();

    consumer = module.get<ProposalConsumer>(ProposalConsumer);
    proposalModelService = module.get<ProposalModelService>(ProposalModelService);

    // Spy on logger methods to avoid console output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processProposalCreation', () => {
    it('should process a proposal creation job successfully', async () => {
      // Act
      await consumer.processProposalCreation(mockJob as any);

      // Assert
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Processing proposal creation job ${mockJob.id}`
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Proposal ${mockJob.data.proposalId} created for DAO ${mockJob.data.daoId} by ${mockJob.data.creatorAddress}`
      );
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Completed processing proposal creation job ${mockJob.id}`
      );
    });

    it('should log and rethrow errors during proposal creation processing', async () => {
      // Arrange
      const mockError = new Error('Test error');
      jest.spyOn(Logger.prototype, 'log').mockImplementationOnce(() => {
        throw mockError;
      });

      // Act & Assert
      await expect(consumer.processProposalCreation(mockJob as any)).rejects.toThrow(mockError);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Error processing proposal creation job ${mockJob.id}`,
        mockError.stack
      );
    });
  });

  describe('processExpiredProposals', () => {
    it('should process expired proposals job successfully', async () => {
      // Act
      await consumer.processExpiredProposals(mockExpiredProposalsJob as any);

      // Assert
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Processing expired proposals job ${mockExpiredProposalsJob.id}`
      );
      expect(proposalModelService.processExpiredProposals).toHaveBeenCalled();
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Completed processing expired proposals job ${mockExpiredProposalsJob.id}`
      );
    });

    it('should log and rethrow errors during expired proposals processing', async () => {
      // Arrange
      const mockError = new Error('Test error');
      jest.spyOn(proposalModelService, 'processExpiredProposals').mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(consumer.processExpiredProposals(mockExpiredProposalsJob as any)).rejects.toThrow(mockError);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Error processing expired proposals job ${mockExpiredProposalsJob.id}`,
        mockError.stack
      );
    });
  });
}); 