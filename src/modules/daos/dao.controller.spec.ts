/**
 * @file dao.controller.spec.ts
 * @description Test suite for the DAO controller
 * 
 * This file contains comprehensive tests for the DAO controller, covering
 * all API endpoints, input validation, error handling, and responses.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DaoController } from './dao.controller';
import { DaoService } from './dao.service';
import { CreateDaoDto } from './dto/create-dao.dto';
import { Dao, DaoStatus } from './entities/dao.entity';
import { Error as MongooseError } from 'mongoose';

describe('DaoController', () => {
  let controller: DaoController;
  let service: DaoService;

  beforeEach(async () => {
    const daoServiceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneWithProposals: jest.fn(),
      findByOwner: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DaoController],
      providers: [
        {
          provide: DaoService,
          useValue: daoServiceMock,
        },
      ],
    }).compile();

    controller = module.get<DaoController>(DaoController);
    service = module.get<DaoService>(DaoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test DAO creation endpoint
   */
  describe('create', () => {
    it('should create a new DAO successfully', async () => {
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

      const expectedDao: Partial<Dao> = {
        daoId: 'dao-123',
        name: createDaoDto.name,
        description: createDaoDto.description,
        ownerAddress: createDaoDto.ownerAddress,
        status: DaoStatus.ACTIVE,
        votingRules: createDaoDto.votingRules,
        members: createDaoDto.members,
        proposals: []
      };

      jest.spyOn(service, 'create').mockResolvedValue(expectedDao as Dao);

      // Act
      const result = await controller.create(createDaoDto);

      // Assert
      expect(result).toBe(expectedDao);
      expect(service.create).toHaveBeenCalledWith(createDaoDto);
    });

    it('should throw BadRequestException on validation error', async () => {
      // Arrange
      const createDaoDto: CreateDaoDto = {
        name: 'Test DAO',
        description: 'A test DAO',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };

      const validationError = new MongooseError.ValidationError();
      validationError.errors = {
        name: { message: 'Name is required' } as any
      };

      jest.spyOn(service, 'create').mockRejectedValue(validationError);

      // Act & Assert
      await expect(controller.create(createDaoDto)).rejects.toThrow(BadRequestException);
      expect(service.create).toHaveBeenCalledWith(createDaoDto);
    });

    it('should throw BadRequestException on generic ValidationError', async () => {
      // Arrange
      const createDaoDto: CreateDaoDto = {
        name: 'Test DAO',
        description: 'A test DAO',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };

      // Create a generic validation error that's not a MongooseError.ValidationError
      const genericValidationError = new Error('Generic validation failed');
      genericValidationError.name = 'ValidationError';
      genericValidationError.message = 'Some validation constraints were not satisfied';

      jest.spyOn(service, 'create').mockRejectedValue(genericValidationError);

      // Act & Assert
      await expect(controller.create(createDaoDto)).rejects.toThrowError(BadRequestException);
      expect(service.create).toHaveBeenCalledWith(createDaoDto);
    });

    it('should throw BadRequestException on duplicate DAO error', async () => {
      // Arrange
      const createDaoDto: CreateDaoDto = {
        name: 'Test DAO',
        description: 'A test DAO',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };

      const duplicateError = new Error('Duplicate key error');
      duplicateError.name = 'MongoServerError';
      (duplicateError as any).code = 11000;

      jest.spyOn(service, 'create').mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(controller.create(createDaoDto)).rejects.toThrow(BadRequestException);
      expect(service.create).toHaveBeenCalledWith(createDaoDto);
    });

    it('should propagate BadRequestException from service', async () => {
      // Arrange
      const createDaoDto: CreateDaoDto = {
        name: 'Test DAO',
        description: 'A test DAO',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };

      const badRequestError = new BadRequestException('Invalid DAO parameters');
      jest.spyOn(service, 'create').mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.create(createDaoDto)).rejects.toThrow(BadRequestException);
      expect(service.create).toHaveBeenCalledWith(createDaoDto);
    });

    it('should throw InternalServerErrorException on unexpected errors', async () => {
      // Arrange
      const createDaoDto: CreateDaoDto = {
        name: 'Test DAO',
        description: 'A test DAO',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };

      jest.spyOn(service, 'create').mockRejectedValue(new Error('Unexpected error'));
      
      // Mock console.error to prevent actual logging during tests
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(controller.create(createDaoDto)).rejects.toThrow(InternalServerErrorException);
      expect(service.create).toHaveBeenCalledWith(createDaoDto);
    });
  });

  /**
   * Test findAll endpoint
   */
  describe('findAll', () => {
    it('should return an array of DAOs', async () => {
      // Arrange
      const expectedDaos: Partial<Dao>[] = [
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

      jest.spyOn(service, 'findAll').mockResolvedValue(expectedDaos as Dao[]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toBe(expectedDaos);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should handle errors and throw InternalServerErrorException', async () => {
      // Arrange
      jest.spyOn(service, 'findAll').mockRejectedValue(new Error('Database error'));
      
      // Mock console.error to prevent actual logging during tests
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(controller.findAll()).rejects.toThrow(InternalServerErrorException);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  /**
   * Test findOne endpoint
   */
  describe('findOne', () => {
    it('should return a DAO by ID', async () => {
      // Arrange
      const daoId = 'dao-123';
      const expectedDao: Partial<Dao> = {
        daoId,
        name: 'Test DAO',
        description: 'Test DAO description',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(expectedDao as Dao);

      // Act
      const result = await controller.findOne(daoId);

      // Assert
      expect(result).toBe(expectedDao);
      expect(service.findOne).toHaveBeenCalledWith(daoId);
    });

    it('should propagate NotFoundException from service', async () => {
      // Arrange
      const daoId = 'non-existent-dao';
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException(`DAO with ID ${daoId} not found`));

      // Act & Assert
      await expect(controller.findOne(daoId)).rejects.toThrow(NotFoundException);
      expect(service.findOne).toHaveBeenCalledWith(daoId);
    });

    it('should handle unexpected errors and throw InternalServerErrorException', async () => {
      // Arrange
      const daoId = 'dao-123';
      jest.spyOn(service, 'findOne').mockRejectedValue(new Error('Database error'));
      
      // Mock console.error to prevent actual logging during tests
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(controller.findOne(daoId)).rejects.toThrow(InternalServerErrorException);
      expect(service.findOne).toHaveBeenCalledWith(daoId);
    });
  });

  /**
   * Test findOneWithProposals endpoint
   */
  describe('findOneWithProposals', () => {
    it('should return a DAO with its proposals', async () => {
      // Arrange
      const daoId = 'dao-123';
      const expectedDao: Partial<Dao> = {
        daoId,
        name: 'Test DAO',
        description: 'Test DAO with proposals',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        proposals: []
      };

      jest.spyOn(service, 'findOneWithProposals').mockResolvedValue(expectedDao as Dao);

      // Act
      const result = await controller.findOneWithProposals(daoId);

      // Assert
      expect(result).toBe(expectedDao);
      expect(service.findOneWithProposals).toHaveBeenCalledWith(daoId);
    });

    it('should propagate NotFoundException from service', async () => {
      // Arrange
      const daoId = 'non-existent-dao';
      jest.spyOn(service, 'findOneWithProposals').mockRejectedValue(new NotFoundException(`DAO with ID ${daoId} not found`));

      // Act & Assert
      await expect(controller.findOneWithProposals(daoId)).rejects.toThrow(NotFoundException);
      expect(service.findOneWithProposals).toHaveBeenCalledWith(daoId);
    });

    it('should handle unexpected errors and throw InternalServerErrorException', async () => {
      // Arrange
      const daoId = 'dao-123';
      jest.spyOn(service, 'findOneWithProposals').mockRejectedValue(new Error('Database error'));
      
      // Mock console.error to prevent actual logging during tests
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(controller.findOneWithProposals(daoId)).rejects.toThrow(InternalServerErrorException);
      expect(service.findOneWithProposals).toHaveBeenCalledWith(daoId);
    });
  });

  /**
   * Test findByOwner endpoint
   */
  describe('findByOwner', () => {
    it('should return all DAOs owned by the specified address', async () => {
      // Arrange
      const ownerAddress = '0.0.owner123';
      const expectedDaos: Partial<Dao>[] = [
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

      jest.spyOn(service, 'findByOwner').mockResolvedValue(expectedDaos as Dao[]);

      // Act
      const result = await controller.findByOwner(ownerAddress);

      // Assert
      expect(result).toBe(expectedDaos);
      expect(service.findByOwner).toHaveBeenCalledWith(ownerAddress);
    });

    it('should handle errors and throw InternalServerErrorException', async () => {
      // Arrange
      const ownerAddress = '0.0.owner123';
      jest.spyOn(service, 'findByOwner').mockRejectedValue(new Error('Database error'));
      
      // Mock console.error to prevent actual logging during tests
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(controller.findByOwner(ownerAddress)).rejects.toThrow(InternalServerErrorException);
      expect(service.findByOwner).toHaveBeenCalledWith(ownerAddress);
    });
  });

  /**
   * Test addMember endpoint
   */
  describe('addMember', () => {
    it('should add a member to a DAO', async () => {
      // Arrange
      const daoId = 'dao-123';
      const memberAddress = '0.0.newmember';
      const expectedDao: Partial<Dao> = {
        daoId,
        name: 'Test DAO',
        description: 'Test DAO description',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        members: ['0.0.123456', memberAddress]
      };

      jest.spyOn(service, 'addMember').mockResolvedValue(expectedDao as Dao);

      // Act
      const result = await controller.addMember(daoId, memberAddress);

      // Assert
      expect(result).toBe(expectedDao);
      expect(service.addMember).toHaveBeenCalledWith(daoId, memberAddress);
    });

    it('should propagate NotFoundException from service', async () => {
      // Arrange
      const daoId = 'non-existent-dao';
      const memberAddress = '0.0.newmember';
      jest.spyOn(service, 'addMember').mockRejectedValue(new NotFoundException(`DAO with ID ${daoId} not found`));

      // Act & Assert
      await expect(controller.addMember(daoId, memberAddress)).rejects.toThrow(NotFoundException);
      expect(service.addMember).toHaveBeenCalledWith(daoId, memberAddress);
    });
    
    it('should propagate BadRequestException from service', async () => {
      // Arrange
      const daoId = 'dao-123';
      const memberAddress = '0.0.already-member';
      const badRequestError = new BadRequestException('Member already exists in DAO');
      jest.spyOn(service, 'addMember').mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.addMember(daoId, memberAddress)).rejects.toThrow(BadRequestException);
      await expect(controller.addMember(daoId, memberAddress)).rejects.toThrow('Member already exists in DAO');
      expect(service.addMember).toHaveBeenCalledWith(daoId, memberAddress);
    });

    it('should handle unexpected errors and throw InternalServerErrorException', async () => {
      // Arrange
      const daoId = 'dao-123';
      const memberAddress = '0.0.newmember';
      jest.spyOn(service, 'addMember').mockRejectedValue(new Error('Database error'));
      
      // Mock console.error to prevent actual logging during tests
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(controller.addMember(daoId, memberAddress)).rejects.toThrow(InternalServerErrorException);
      expect(service.addMember).toHaveBeenCalledWith(daoId, memberAddress);
    });
  });
}); 