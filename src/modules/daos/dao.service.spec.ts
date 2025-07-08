/**
 * @file dao.service.spec.ts
 * @description Test suite for the DAO service
 * 
 * This file contains comprehensive tests for the DAO service, covering
 * all business logic operations and interactions with the model service
 * and background processing queue.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { DaoService } from './dao.service';
import { DaoModelService } from './dao.model.service';
import { Dao, DaoStatus } from './entities/dao.entity';
import { CreateDaoDto } from './dto/create-dao.dto';
import { NotFoundException } from '@nestjs/common';

describe('DaoService', () => {
  let service: DaoService;
  let modelService: DaoModelService;
  let queueMock: any;

  beforeEach(async () => {
    // Create mock implementations
    const modelServiceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneWithProposals: jest.fn(),
      findByOwner: jest.fn(),
      update: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
      isMember: jest.fn(),
      addProposal: jest.fn(),
    };

    queueMock = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DaoService,
        {
          provide: DaoModelService,
          useValue: modelServiceMock,
        },
        {
          provide: getQueueToken('dao'),
          useValue: queueMock,
        },
      ],
    }).compile();

    service = module.get<DaoService>(DaoService);
    modelService = module.get<DaoModelService>(DaoModelService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test DAO creation
   */
  describe('create', () => {
    it('should create a DAO and add a job to the queue', async () => {
      // Arrange
      const createDaoDto: CreateDaoDto = {
        name: 'Test DAO',
        description: 'A test DAO for unit testing',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: ['0.0.123456']
      };

      const mockDao: Partial<Dao> = {
        daoId: 'dao-test-123',
        name: createDaoDto.name,
        description: createDaoDto.description,
        ownerAddress: createDaoDto.ownerAddress,
        status: DaoStatus.ACTIVE,
        votingRules: createDaoDto.votingRules,
        members: createDaoDto.members
      };

      jest.spyOn(modelService, 'create').mockResolvedValue(mockDao as Dao);

      // Act
      const result = await service.create(createDaoDto);

      // Assert
      expect(result).toBe(mockDao);
      expect(modelService.create).toHaveBeenCalledWith(createDaoDto);
      expect(queueMock.add).toHaveBeenCalledWith(
        'process-dao-creation',
        {
          daoId: mockDao.daoId,
          ownerAddress: mockDao.ownerAddress
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      );
    });
  });

  /**
   * Test finding all DAOs
   */
  describe('findAll', () => {
    it('should return all DAOs from the model service', async () => {
      // Arrange
      const mockDaos: Partial<Dao>[] = [
        {
          daoId: 'dao-1',
          name: 'First DAO',
          description: 'First test DAO',
          ownerAddress: '0.0.111111',
          status: DaoStatus.ACTIVE
        },
        {
          daoId: 'dao-2',
          name: 'Second DAO',
          description: 'Second test DAO',
          ownerAddress: '0.0.222222',
          status: DaoStatus.PENDING
        }
      ];

      jest.spyOn(modelService, 'findAll').mockResolvedValue(mockDaos as Dao[]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toBe(mockDaos);
      expect(modelService.findAll).toHaveBeenCalled();
    });
  });

  /**
   * Test finding a specific DAO
   */
  describe('findOne', () => {
    it('should return a specific DAO by ID', async () => {
      // Arrange
      const daoId = 'dao-test-123';
      const mockDao: Partial<Dao> = {
        daoId,
        name: 'Test DAO',
        description: 'Test DAO description',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE
      };

      jest.spyOn(modelService, 'findOne').mockResolvedValue(mockDao as Dao);

      // Act
      const result = await service.findOne(daoId);

      // Assert
      expect(result).toBe(mockDao);
      expect(modelService.findOne).toHaveBeenCalledWith(daoId);
    });

    it('should throw NotFoundException when DAO is not found', async () => {
      // Arrange
      const daoId = 'non-existent-dao';
      jest.spyOn(modelService, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(daoId)).rejects.toThrow(NotFoundException);
      expect(modelService.findOne).toHaveBeenCalledWith(daoId);
    });
  });

  /**
   * Test finding a DAO with proposals
   */
  describe('findOneWithProposals', () => {
    it('should return a DAO with populated proposals', async () => {
      // Arrange
      const daoId = 'dao-with-proposals';
      const mockDao: Partial<Dao> = {
        daoId,
        name: 'Proposals DAO',
        description: 'DAO with proposals',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        proposals: []
      };

      jest.spyOn(modelService, 'findOneWithProposals').mockResolvedValue(mockDao as Dao);

      // Act
      const result = await service.findOneWithProposals(daoId);

      // Assert
      expect(result).toBe(mockDao);
      expect(modelService.findOneWithProposals).toHaveBeenCalledWith(daoId);
    });

    it('should throw NotFoundException when DAO is not found', async () => {
      // Arrange
      const daoId = 'non-existent-dao';
      jest.spyOn(modelService, 'findOneWithProposals').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOneWithProposals(daoId)).rejects.toThrow(NotFoundException);
      expect(modelService.findOneWithProposals).toHaveBeenCalledWith(daoId);
    });
  });

  /**
   * Test finding DAOs by owner
   */
  describe('findByOwner', () => {
    it('should return DAOs owned by the specified address', async () => {
      // Arrange
      const ownerAddress = '0.0.owner123';
      const mockDaos: Partial<Dao>[] = [
        {
          daoId: 'dao-owner-1',
          name: 'Owner DAO 1',
          description: 'First DAO owned by test address',
          ownerAddress,
          status: DaoStatus.ACTIVE
        },
        {
          daoId: 'dao-owner-2',
          name: 'Owner DAO 2',
          description: 'Second DAO owned by test address',
          ownerAddress,
          status: DaoStatus.ACTIVE
        }
      ];

      jest.spyOn(modelService, 'findByOwner').mockResolvedValue(mockDaos as Dao[]);

      // Act
      const result = await service.findByOwner(ownerAddress);

      // Assert
      expect(result).toBe(mockDaos);
      expect(modelService.findByOwner).toHaveBeenCalledWith(ownerAddress);
    });
  });

  /**
   * Test adding a member to a DAO
   */
  describe('addMember', () => {
    it('should add a member to a DAO and enqueue the operation', async () => {
      // Arrange
      const daoId = 'dao-test-123';
      const memberAddress = '0.0.newmember';
      
      const mockDao: Partial<Dao> = {
        daoId,
        name: 'Test DAO',
        description: 'Test DAO description',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        members: ['0.0.123456', memberAddress]
      };

      jest.spyOn(modelService, 'isMember').mockResolvedValue(false);
      jest.spyOn(modelService, 'addMember').mockResolvedValue(mockDao as Dao);

      // Act
      const result = await service.addMember(daoId, memberAddress);

      // Assert
      expect(result).toBe(mockDao);
      expect(modelService.isMember).toHaveBeenCalledWith(daoId, memberAddress);
      expect(modelService.addMember).toHaveBeenCalledWith(daoId, memberAddress);
      expect(queueMock.add).toHaveBeenCalledWith(
        'process-member-addition',
        {
          daoId,
          memberAddress
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      );
    });

    it('should not add a member if they are already in the DAO', async () => {
      // Arrange
      const daoId = 'dao-test-123';
      const memberAddress = '0.0.existingmember';
      
      const mockDao: Partial<Dao> = {
        daoId,
        name: 'Test DAO',
        description: 'Test DAO description',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        members: ['0.0.123456', memberAddress]
      };

      jest.spyOn(modelService, 'isMember').mockResolvedValue(true);
      jest.spyOn(modelService, 'findOne').mockResolvedValue(mockDao as Dao);

      // Act
      const result = await service.addMember(daoId, memberAddress);

      // Assert
      expect(result).toBe(mockDao);
      expect(modelService.isMember).toHaveBeenCalledWith(daoId, memberAddress);
      expect(modelService.addMember).not.toHaveBeenCalled();
      expect(queueMock.add).not.toHaveBeenCalled();
    });
  });

  /**
   * Test removing a member from a DAO
   */
  describe('removeMember', () => {
    it('should remove a member from a DAO and enqueue the operation', async () => {
      // Arrange
      const daoId = 'dao-test-123';
      const memberAddress = '0.0.member';
      
      const mockDao: Partial<Dao> = {
        daoId,
        name: 'Test DAO',
        description: 'Test DAO description',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        members: ['0.0.123456'] // Member already removed
      };

      jest.spyOn(modelService, 'isMember').mockResolvedValue(true);
      jest.spyOn(modelService, 'removeMember').mockResolvedValue(mockDao as Dao);

      // Act
      const result = await service.removeMember(daoId, memberAddress);

      // Assert
      expect(result).toBe(mockDao);
      expect(modelService.isMember).toHaveBeenCalledWith(daoId, memberAddress);
      expect(modelService.removeMember).toHaveBeenCalledWith(daoId, memberAddress);
      expect(queueMock.add).toHaveBeenCalledWith(
        'process-member-removal',
        {
          daoId,
          memberAddress
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      );
    });

    it('should not attempt to remove a member if they are not in the DAO', async () => {
      // Arrange
      const daoId = 'dao-test-123';
      const memberAddress = '0.0.nonmember';
      
      const mockDao: Partial<Dao> = {
        daoId,
        name: 'Test DAO',
        description: 'Test DAO description',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        members: ['0.0.123456']
      };

      jest.spyOn(modelService, 'isMember').mockResolvedValue(false);
      jest.spyOn(modelService, 'findOne').mockResolvedValue(mockDao as Dao);

      // Act
      const result = await service.removeMember(daoId, memberAddress);

      // Assert
      expect(result).toBe(mockDao);
      expect(modelService.isMember).toHaveBeenCalledWith(daoId, memberAddress);
      expect(modelService.removeMember).not.toHaveBeenCalled();
      expect(queueMock.add).not.toHaveBeenCalled();
    });
  });
}); 