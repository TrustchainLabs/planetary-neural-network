/**
 * @file dao.consumer.spec.ts
 * @description Tests for the DaoConsumer class
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { DaoConsumer } from './dao.consumer';
import { DaoModelService } from './dao.model.service';
import { Logger } from '@nestjs/common';

describe('DaoConsumer', () => {
  let consumer: DaoConsumer;
  let daoModelService: DaoModelService;

  // Mock job objects
  const mockJob = {
    id: 'job-123',
    data: {
      daoId: 'dao-123',
      ownerAddress: '0x123'
    }
  };

  // Create a mock queue for Bull
  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    // Create a mock implementation for the DaoModelService
    const mockDaoModelService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DaoConsumer,
        {
          provide: DaoModelService,
          useValue: mockDaoModelService,
        },
        {
          provide: getQueueToken('dao'),
          useValue: mockQueue,
        }
      ],
    }).compile();

    consumer = module.get<DaoConsumer>(DaoConsumer);
    daoModelService = module.get<DaoModelService>(DaoModelService);

    // Spy on logger methods to avoid console output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processDaoCreation', () => {
    it('should process a DAO creation job successfully', async () => {
      // Act
      await consumer.processDaoCreation(mockJob as any);

      // Assert
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Processing DAO creation job ${mockJob.id}`
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `DAO ${mockJob.data.daoId} created by ${mockJob.data.ownerAddress}`
      );
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Completed processing DAO creation job ${mockJob.id}`
      );
    });

    it('should log and rethrow errors during DAO creation processing', async () => {
      // Arrange
      const mockError = new Error('Test error');
      jest.spyOn(Logger.prototype, 'log').mockImplementationOnce(() => {
        throw mockError;
      });

      // Act & Assert
      await expect(consumer.processDaoCreation(mockJob as any)).rejects.toThrow(mockError);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Error processing DAO creation job ${mockJob.id}`,
        mockError.stack
      );
    });
  });
}); 