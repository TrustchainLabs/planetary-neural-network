/**
 * @file dao.model.service.spec.ts
 * @description Test suite for the DAO model service
 * 
 * This file contains comprehensive tests for the DAO model service, covering
 * all CRUD operations and special methods for DAO management.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { DaoModelService } from './dao.model.service';
import { Dao, DaoStatus } from './entities/dao.entity';
import { CreateDaoDto } from './dto/create-dao.dto';
import { NotFoundException } from '@nestjs/common';

describe('DaoModelService', () => {
  let service: DaoModelService;
  let mockDaoModel: any;
  
  beforeEach(async () => {
    // Create a mock implementation of the DAO model
    mockDaoModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockImplementation(function() {
        return Promise.resolve(this);
      }),
    }));
    
    // Add static methods to the model function
    mockDaoModel.find = jest.fn().mockReturnThis();
    mockDaoModel.findOne = jest.fn().mockReturnThis();
    mockDaoModel.findOneAndUpdate = jest.fn().mockReturnThis();
    mockDaoModel.populate = jest.fn().mockReturnThis();
    mockDaoModel.exec = jest.fn().mockReturnThis();
    
    // Set up the module with our mock model
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DaoModelService,
        {
          provide: getModelToken(Dao.name),
          useValue: mockDaoModel,
        },
      ],
    }).compile();

    service = module.get<DaoModelService>(DaoModelService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test DAO creation
   */
  describe('create', () => {
    it('should create a new DAO with correct data', async () => {
      // Arrange
      const daoData: CreateDaoDto = {
        name: 'Test DAO',
        description: 'A test DAO',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: false
        }
      };

      // Mock save method to return our expected DAO object
      const mockSavedDao = {
        ...daoData,
        daoId: 'mock-dao-id',
        status: DaoStatus.ACTIVE,
        members: [daoData.ownerAddress],
        proposals: []
      };
      
      mockDaoModel.mockImplementationOnce((data) => ({
        ...data,
        save: jest.fn().mockResolvedValueOnce(mockSavedDao)
      }));

      // Act
      const result = await service.create(daoData);

      // Assert
      expect(result).toBeDefined();
      expect(result.daoId).toBe('mock-dao-id');
      expect(result.name).toBe(daoData.name);
      expect(result.status).toBe(DaoStatus.ACTIVE);
      expect(result.members).toContain(daoData.ownerAddress);
    });

    it('should create a DAO with default members if not provided', async () => {
      // Arrange
      const daoData: CreateDaoDto = {
        name: 'Test DAO',
        description: 'A test DAO',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: false
        }
      };
      
      // Mock save method to return our expected DAO object
      const mockSavedDao = {
        ...daoData,
        daoId: 'mock-dao-id',
        status: DaoStatus.ACTIVE,
        members: [daoData.ownerAddress],
        proposals: []
      };
      
      mockDaoModel.mockImplementationOnce((data) => ({
        ...data,
        save: jest.fn().mockResolvedValueOnce(mockSavedDao)
      }));

      // Act
      const result = await service.create(daoData);

      // Assert
      expect(result.members).toContain(daoData.ownerAddress);
      expect(result.members.length).toBe(1);
    });
  });

  /**
   * Test finding all DAOs
   */
  describe('findAll', () => {
    it('should return an empty array when no DAOs exist', async () => {
      // Arrange
      mockDaoModel.exec.mockResolvedValue([]);
      
      // Act
      const daos = await service.findAll();
      
      // Assert
      expect(daos).toBeDefined();
      expect(Array.isArray(daos)).toBe(true);
      expect(daos.length).toBe(0);
      expect(mockDaoModel.find).toHaveBeenCalled();
    });

    it('should return all DAOs when multiple exist', async () => {
      // Arrange
      const mockDaos = [
        {
          daoId: 'dao-1',
          name: 'First DAO',
          description: 'First test DAO',
          ownerAddress: '0.0.111111',
          status: DaoStatus.ACTIVE,
          votingRules: {
            threshold: 51,
            minVotingPeriod: 24,
            tokenWeighted: true
          }
        },
        {
          daoId: 'dao-2',
          name: 'Second DAO',
          description: 'Second test DAO',
          ownerAddress: '0.0.222222',
          status: DaoStatus.PENDING,
          votingRules: {
            threshold: 60,
            minVotingPeriod: 48,
            tokenWeighted: false
          }
        }
      ];
      
      mockDaoModel.exec.mockResolvedValue(mockDaos);
      
      // Act
      const daos = await service.findAll();
      
      // Assert
      expect(daos).toBeDefined();
      expect(Array.isArray(daos)).toBe(true);
      expect(daos.length).toBe(2);
      expect(daos.map(dao => dao.daoId)).toEqual(expect.arrayContaining(['dao-1', 'dao-2']));
      expect(mockDaoModel.find).toHaveBeenCalled();
    });
  });

  /**
   * Test finding a single DAO by ID
   */
  describe('findOne', () => {
    it('should return a DAO when it exists', async () => {
      // Arrange
      const mockDao = {
        daoId: 'dao-test',
        name: 'Test DAO',
        description: 'Test DAO for findOne',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };
      
      mockDaoModel.exec.mockResolvedValue(mockDao);
      
      // Act
      const foundDao = await service.findOne('dao-test');
      
      // Assert
      expect(foundDao).toBeDefined();
      expect(foundDao.daoId).toBe('dao-test');
      expect(mockDaoModel.findOne).toHaveBeenCalledWith({ daoId: 'dao-test' });
    });

    it('should return null when DAO does not exist', async () => {
      // Arrange
      mockDaoModel.exec.mockResolvedValue(null);
      
      // Act
      const foundDao = await service.findOne('non-existent-dao');
      
      // Assert
      expect(foundDao).toBeNull();
      expect(mockDaoModel.findOne).toHaveBeenCalledWith({ daoId: 'non-existent-dao' });
    });
  });

  /**
   * Test finding a DAO with populated proposals
   */
  describe('findOneWithProposals', () => {
    it('should return a DAO with populated proposals', async () => {
      // Arrange
      const mockDao = {
        daoId: 'dao-with-proposals',
        name: 'Proposals DAO',
        description: 'DAO with proposals',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        proposals: []
      };
      
      mockDaoModel.exec.mockResolvedValue(mockDao);
      
      // Act
      const foundDao = await service.findOneWithProposals('dao-with-proposals');
      
      // Assert
      expect(foundDao).toBeDefined();
      expect(foundDao.daoId).toBe('dao-with-proposals');
      expect(Array.isArray(foundDao.proposals)).toBe(true);
      expect(mockDaoModel.findOne).toHaveBeenCalledWith({ daoId: 'dao-with-proposals' });
      expect(mockDaoModel.populate).toHaveBeenCalledWith('proposals');
    });
  });

  /**
   * Test finding DAOs by owner
   */
  describe('findByOwner', () => {
    it('should return DAOs owned by the specified address', async () => {
      // Arrange
      const ownerAddress = '0.0.owner123';
      
      const mockDaos = [
        {
          daoId: 'dao-owner-1',
          name: 'Owner DAO 1',
          description: 'First DAO owned by test address',
          ownerAddress: ownerAddress,
          status: DaoStatus.ACTIVE,
          votingRules: {
            threshold: 51,
            minVotingPeriod: 24,
            tokenWeighted: true
          }
        },
        {
          daoId: 'dao-owner-2',
          name: 'Owner DAO 2',
          description: 'Second DAO owned by test address',
          ownerAddress: ownerAddress,
          status: DaoStatus.ACTIVE,
          votingRules: {
            threshold: 60,
            minVotingPeriod: 48,
            tokenWeighted: false
          }
        }
      ];
      
      mockDaoModel.exec.mockResolvedValue(mockDaos);
      
      // Act
      const ownerDaos = await service.findByOwner(ownerAddress);
      
      // Assert
      expect(ownerDaos).toBeDefined();
      expect(Array.isArray(ownerDaos)).toBe(true);
      expect(ownerDaos.length).toBe(2);
      expect(ownerDaos.map(dao => dao.daoId)).toEqual(expect.arrayContaining(['dao-owner-1', 'dao-owner-2']));
      expect(mockDaoModel.find).toHaveBeenCalledWith({ ownerAddress });
    });

    it('should return empty array when no DAOs are owned by the address', async () => {
      // Arrange
      mockDaoModel.exec.mockResolvedValue([]);
      
      // Act
      const ownerDaos = await service.findByOwner('0.0.nonowner');
      
      // Assert
      expect(ownerDaos).toBeDefined();
      expect(Array.isArray(ownerDaos)).toBe(true);
      expect(ownerDaos.length).toBe(0);
      expect(mockDaoModel.find).toHaveBeenCalledWith({ ownerAddress: '0.0.nonowner' });
    });
  });

  /**
   * Test updating a DAO
   */
  describe('update', () => {
    it('should update a DAO successfully', async () => {
      // Arrange
      const daoId = 'dao-to-update';
      
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        status: DaoStatus.INACTIVE
      };
      
      const mockUpdatedDao = {
        daoId,
        name: 'Updated Name',
        description: 'Updated description',
        ownerAddress: '0.0.123456',
        status: DaoStatus.INACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };
      
      mockDaoModel.exec.mockResolvedValue(mockUpdatedDao);
      
      // Act
      const updatedDao = await service.update(daoId, updateData);
      
      // Assert
      expect(updatedDao).toBeDefined();
      expect(updatedDao.daoId).toBe(daoId);
      expect(updatedDao.name).toBe(updateData.name);
      expect(updatedDao.description).toBe(updateData.description);
      expect(updatedDao.status).toBe(updateData.status);
      expect(mockDaoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { daoId },
        updateData,
        { new: true }
      );
    });

    it('should throw NotFoundException when updating non-existent DAO', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Name'
      };
      
      mockDaoModel.exec.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.update('non-existent-dao', updateData))
        .rejects.toThrow(NotFoundException);
      
      expect(mockDaoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { daoId: 'non-existent-dao' },
        updateData,
        { new: true }
      );
    });
  });

  /**
   * Test adding a member to a DAO
   */
  describe('addMember', () => {
    it('should add a new member to a DAO', async () => {
      // Arrange
      const daoId = 'test-dao-add-member';
      const newMember = '0.0.newmember';
      
      const mockDao = {
        daoId,
        name: 'Test DAO',
        description: 'DAO for testing member addition',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: ['0.0.123456', newMember],
        proposals: []
      };
      
      mockDaoModel.exec.mockResolvedValue(mockDao);

      // Act
      const updatedDao = await service.addMember(daoId, newMember);
      
      // Assert
      expect(updatedDao).toBeDefined();
      expect(updatedDao.members).toContain(newMember);
      expect(updatedDao.daoId).toBe(daoId);
      expect(mockDaoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { daoId, members: { $ne: newMember } },
        { $addToSet: { members: newMember } },
        { new: true }
      );
    });

    it('should not duplicate members when adding an existing member', async () => {
      // Arrange
      const daoId = 'dao-existing-member';
      const existingMember = '0.0.existing';
      
      // The service should throw an exception when the member already exists
      mockDaoModel.exec.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.addMember(daoId, existingMember))
        .rejects.toThrow(NotFoundException);
      
      expect(mockDaoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { daoId, members: { $ne: existingMember } },
        { $addToSet: { members: existingMember } },
        { new: true }
      );
    });

    it('should throw NotFoundException when adding member to non-existent DAO', async () => {
      // Arrange
      mockDaoModel.exec.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.addMember('non-existent-dao', '0.0.member'))
        .rejects.toThrow(NotFoundException);
      
      expect(mockDaoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { daoId: 'non-existent-dao', members: { $ne: '0.0.member' } },
        { $addToSet: { members: '0.0.member' } },
        { new: true }
      );
    });
  });

  /**
   * Test removing a member from a DAO
   */
  describe('removeMember', () => {
    it('should remove a member from a DAO', async () => {
      // Arrange
      const daoId = 'test-dao-remove-member';
      const memberToRemove = '0.0.member';
      
      const mockDao = {
        daoId,
        name: 'Test DAO',
        description: 'DAO for testing member removal',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: ['0.0.123456'], // Member already removed
        proposals: []
      };
      
      mockDaoModel.exec.mockResolvedValue(mockDao);
      
      // Act
      const updatedDao = await service.removeMember(daoId, memberToRemove);
      
      // Assert
      expect(updatedDao).toBeDefined();
      expect(updatedDao.members).not.toContain(memberToRemove);
      expect(mockDaoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { daoId }, 
        { $pull: { members: memberToRemove } },
        { new: true }
      );
    });

    it('should not change members array when removing non-existent member', async () => {
      // Arrange
      const daoId = 'test-dao-nonexistent-member';
      const nonExistentMember = '0.0.nonexistent';
      
      const mockDao = {
        daoId,
        name: 'Test DAO',
        description: 'DAO for testing non-existent member removal',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: ['0.0.123456'], // Member was never there
        proposals: []
      };
      
      mockDaoModel.exec.mockResolvedValue(mockDao);
      
      // Act
      const updatedDao = await service.removeMember(daoId, nonExistentMember);
      
      // Assert
      expect(updatedDao).toBeDefined();
      expect(updatedDao.members).not.toContain(nonExistentMember);
      expect(updatedDao.members.length).toBe(1);
    });

    it('should throw NotFoundException when removing member from non-existent DAO', async () => {
      // Arrange
      mockDaoModel.exec.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.removeMember('non-existent-dao', '0.0.member'))
        .rejects.toThrow(NotFoundException);
      
      expect(mockDaoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { daoId: 'non-existent-dao' }, 
        { $pull: { members: '0.0.member' } },
        { new: true }
      );
    });
  });

  /**
   * Test the isMember method
   */
  describe('isMember', () => {
    it('should return true when address is a member', async () => {
      // Arrange
      const daoId = 'dao-is-member';
      const memberAddress = '0.0.ismember';
      
      const mockDao = {
        daoId,
        name: 'Is Member DAO',
        description: 'DAO for testing membership check',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: ['0.0.123456', memberAddress],
        proposals: []
      };
      
      mockDaoModel.exec.mockResolvedValue(mockDao);
      
      // Act
      const isMember = await service.isMember(daoId, memberAddress);
      
      // Assert
      expect(isMember).toBe(true);
      expect(mockDaoModel.findOne).toHaveBeenCalledWith({ daoId });
    });

    it('should return false when address is not a member', async () => {
      // Arrange
      const daoId = 'dao-not-member';
      const nonMemberAddress = '0.0.notamember';
      
      const mockDao = {
        daoId,
        name: 'Not Member DAO',
        description: 'DAO for testing non-membership check',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: ['0.0.123456'], // Does not include nonMemberAddress
        proposals: []
      };
      
      mockDaoModel.exec.mockResolvedValue(mockDao);
      
      // Act
      const isMember = await service.isMember(daoId, nonMemberAddress);
      
      // Assert
      expect(isMember).toBe(false);
      expect(mockDaoModel.findOne).toHaveBeenCalledWith({ daoId });
    });

    it('should throw NotFoundException when DAO does not exist', async () => {
      // Arrange
      const daoId = 'non-existent-dao';
      const address = '0.0.member';
      
      mockDaoModel.exec.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.isMember(daoId, address))
        .rejects.toThrow(NotFoundException);
      
      expect(mockDaoModel.findOne).toHaveBeenCalledWith({ daoId });
    });
  });

  /**
   * Test adding a proposal to a DAO
   */
  describe('addProposal', () => {
    it('should add a proposal to a DAO', async () => {
      // Arrange
      const daoId = 'test-dao-add-proposal';
      const proposalId = new Types.ObjectId().toString();
      
      const mockDao = {
        daoId,
        name: 'Test DAO',
        description: 'DAO for testing proposal addition',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: ['0.0.123456'],
        proposals: [proposalId]
      };
      
      mockDaoModel.exec.mockResolvedValue(mockDao);
      
      // Act
      const updatedDao = await service.addProposal(daoId, proposalId);
      
      // Assert
      expect(updatedDao).toBeDefined();
      expect(updatedDao.proposals).toContain(proposalId);
      expect(mockDaoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { daoId },
        { $addToSet: { proposals: proposalId } },
        { new: true }
      );
    });

    it('should throw NotFoundException when adding proposal to non-existent DAO', async () => {
      // Arrange
      mockDaoModel.exec.mockResolvedValue(null);
      
      const proposalId = new Types.ObjectId().toString();
      
      // Act & Assert
      await expect(service.addProposal('non-existent-dao', proposalId))
        .rejects.toThrow(NotFoundException);
      
      expect(mockDaoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { daoId: 'non-existent-dao' },
        { $addToSet: { proposals: proposalId } },
        { new: true }
      );
    });
  });
}); 