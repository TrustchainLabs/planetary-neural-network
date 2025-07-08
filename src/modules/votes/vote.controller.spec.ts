/**
 * @file vote.controller.spec.ts
 * @description Test suite for the VoteController
 * 
 * This file contains comprehensive tests for the VoteController, covering
 * all API endpoints, input validation, and error handling.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { Vote, VoteChoice } from './entities/vote.entity';
import { Error as MongooseError } from 'mongoose';
import { Types } from 'mongoose';

describe('VoteController', () => {
  let controller: VoteController;
  let service: VoteService;

  beforeEach(async () => {
    // Create mock VoteService
    const serviceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByProposal: jest.fn(),
      findByUser: jest.fn(),
      calculateResults: jest.fn(),
      countVotesByChoice: jest.fn(),
      findVoterVote: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoteController],
      providers: [
        {
          provide: VoteService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<VoteController>(VoteController);
    service = module.get<VoteService>(VoteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new vote successfully', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES',
        comment: 'Supporting this proposal'
      };

      const mockVote = {
        voteId: 'vote-123',
        proposalId: createVoteDto.proposalId,
        daoId: createVoteDto.daoId,
        voterAddress: createVoteDto.voterAddress,
        choice: createVoteDto.choice,
        comment: createVoteDto.comment,
        // Adding required properties from Vote entity
        proposal: new Types.ObjectId(),
        dao: new Types.ObjectId(),
        weight: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockVote as unknown as Vote);

      // Act
      const result = await controller.create(createVoteDto);

      // Assert
      expect(result).toBe(mockVote);
      expect(service.create).toHaveBeenCalledWith(createVoteDto);
    });

    it('should forward NotFoundException from service', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'non-existent',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      jest.spyOn(service, 'create').mockRejectedValue(new NotFoundException('Proposal not found'));

      // Act & Assert
      await expect(controller.create(createVoteDto)).rejects.toThrow(NotFoundException);
    });

    it('should handle Mongoose ValidationError', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      const validationError = new MongooseError.ValidationError();
      validationError.errors = { field: { message: 'Error message' } as any };
      jest.spyOn(service, 'create').mockRejectedValue(validationError);

      // Act & Assert
      await expect(controller.create(createVoteDto)).rejects.toThrow(BadRequestException);
      await expect(controller.create(createVoteDto)).rejects.toMatchObject({
        response: expect.objectContaining({
          message: 'Validation failed'
        })
      });
    });

    it('should handle generic ValidationError', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.message = 'Some validation message';
      jest.spyOn(service, 'create').mockRejectedValue(validationError);

      // Act & Assert
      await expect(controller.create(createVoteDto)).rejects.toThrow(BadRequestException);
      await expect(controller.create(createVoteDto)).rejects.toMatchObject({
        response: expect.objectContaining({
          message: 'Validation failed',
          details: 'Some validation message'
        })
      });
    });

    it('should handle MongoServerError with duplicate key', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      // Create a MongoDB duplicate key error (code 11000)
      const duplicateKeyError = new Error('Duplicate key error');
      duplicateKeyError.name = 'MongoServerError';
      (duplicateKeyError as any).code = 11000;
      
      jest.spyOn(service, 'create').mockRejectedValue(duplicateKeyError);

      // Act & Assert
      await expect(controller.create(createVoteDto)).rejects.toThrow(BadRequestException);
      await expect(controller.create(createVoteDto)).rejects.toThrow('You have already voted on this proposal');
    });

    it('should forward BadRequestException from service', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      const badRequestError = new BadRequestException('Invalid vote option');
      jest.spyOn(service, 'create').mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.create(createVoteDto)).rejects.toThrow(BadRequestException);
      await expect(controller.create(createVoteDto)).rejects.toThrow('Invalid vote option');
    });

    it('should throw InternalServerErrorException for unknown errors', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      const unknownError = new Error('Unknown server error');
      jest.spyOn(service, 'create').mockRejectedValue(unknownError);

      // Act & Assert
      await expect(controller.create(createVoteDto)).rejects.toThrow(InternalServerErrorException);
      await expect(controller.create(createVoteDto)).rejects.toThrow('Failed to create vote');
    });
  });

  describe('findByProposal', () => {
    it('should return votes for a specific proposal', async () => {
      // Arrange
      const proposalId = 'prop-123';
      const mockVotes = [
        {
          voteId: 'vote-1',
          proposalId,
          daoId: 'dao-123',
          voterAddress: '0.0.111111',
          choice: 'YES',
          // Adding required properties from Vote entity
          proposal: new Types.ObjectId(),
          dao: new Types.ObjectId(),
          weight: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          voteId: 'vote-2',
          proposalId,
          daoId: 'dao-123',
          voterAddress: '0.0.222222',
          choice: 'NO',
          // Adding required properties from Vote entity
          proposal: new Types.ObjectId(),
          dao: new Types.ObjectId(),
          weight: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      jest.spyOn(service, 'findByProposal').mockResolvedValue(mockVotes as unknown as Vote[]);

      // Act
      const result = await controller.findByProposal(proposalId);

      // Assert
      expect(result).toBe(mockVotes);
      expect(service.findByProposal).toHaveBeenCalledWith(proposalId);
    });

    it('should forward NotFoundException from service', async () => {
      // Arrange
      const proposalId = 'non-existent';
      jest.spyOn(service, 'findByProposal').mockRejectedValue(new NotFoundException('Proposal not found'));

      // Act & Assert
      await expect(controller.findByProposal(proposalId)).rejects.toThrow(NotFoundException);
      expect(service.findByProposal).toHaveBeenCalledWith(proposalId);
    });

    it('should throw InternalServerErrorException for unexpected errors', async () => {
      // Arrange
      const proposalId = 'prop-123';
      jest.spyOn(service, 'findByProposal').mockRejectedValue(new Error('Unexpected error'));
      jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error for test

      // Act & Assert
      await expect(controller.findByProposal(proposalId)).rejects.toThrow(InternalServerErrorException);
      expect(service.findByProposal).toHaveBeenCalledWith(proposalId);
    });
  });

  describe('findOne', () => {
    it('should return a specific vote by ID', async () => {
      // Arrange
      const voteId = 'vote-123';
      const mockVote = {
        voteId,
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES',
        // Adding required properties from Vote entity
        proposal: new Types.ObjectId(),
        dao: new Types.ObjectId(),
        weight: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockVote as unknown as Vote);

      // Act
      const result = await controller.findOne(voteId);

      // Assert
      expect(result).toBe(mockVote);
      expect(service.findOne).toHaveBeenCalledWith(voteId);
    });

    it('should forward NotFoundException from service', async () => {
      // Arrange
      const voteId = 'non-existent';
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException('Vote not found'));

      // Act & Assert
      await expect(controller.findOne(voteId)).rejects.toThrow(NotFoundException);
      expect(service.findOne).toHaveBeenCalledWith(voteId);
    });

    it('should throw InternalServerErrorException for unexpected errors', async () => {
      // Arrange
      const voteId = 'vote-123';
      jest.spyOn(service, 'findOne').mockRejectedValue(new Error('Unexpected error'));
      jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error for test

      // Act & Assert
      await expect(controller.findOne(voteId)).rejects.toThrow(InternalServerErrorException);
      expect(service.findOne).toHaveBeenCalledWith(voteId);
    });
  });

  describe('countVotesByChoice', () => {
    it('should return vote counts by choice', async () => {
      // Arrange
      const proposalId = 'prop-123';
      const mockCounts = {
        YES: 5,
        NO: 2,
        ABSTAIN: 1
      };

      jest.spyOn(service, 'countVotesByChoice').mockResolvedValue(mockCounts as Record<VoteChoice, number>);

      // Act
      const result = await controller.countVotesByChoice(proposalId);

      // Assert
      expect(result).toBe(mockCounts);
      expect(service.countVotesByChoice).toHaveBeenCalledWith(proposalId);
    });

    it('should forward NotFoundException from service', async () => {
      // Arrange
      const proposalId = 'non-existent';
      jest.spyOn(service, 'countVotesByChoice').mockRejectedValue(new NotFoundException('Proposal not found'));

      // Act & Assert
      await expect(controller.countVotesByChoice(proposalId)).rejects.toThrow(NotFoundException);
      expect(service.countVotesByChoice).toHaveBeenCalledWith(proposalId);
    });

    it('should throw InternalServerErrorException for unexpected errors', async () => {
      // Arrange
      const proposalId = 'prop-123';
      jest.spyOn(service, 'countVotesByChoice').mockRejectedValue(new Error('Unexpected error'));
      jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error for test

      // Act & Assert
      await expect(controller.countVotesByChoice(proposalId)).rejects.toThrow(InternalServerErrorException);
      expect(service.countVotesByChoice).toHaveBeenCalledWith(proposalId);
    });
  });

  describe('findVoterVote', () => {
    it('should return a specific vote by proposal and voter', async () => {
      // Arrange
      const proposalId = 'prop-123';
      const voterAddress = '0.0.123456';
      const mockVote = {
        voteId: 'vote-123',
        proposalId,
        daoId: 'dao-123',
        voterAddress,
        choice: 'YES',
        // Adding required properties from Vote entity
        proposal: new Types.ObjectId(),
        dao: new Types.ObjectId(),
        weight: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(service, 'findVoterVote').mockResolvedValue(mockVote as unknown as Vote);

      // Act
      const result = await controller.findVoterVote(proposalId, voterAddress);

      // Assert
      expect(result).toBe(mockVote);
      expect(service.findVoterVote).toHaveBeenCalledWith(proposalId, voterAddress);
    });

    it('should forward NotFoundException from service', async () => {
      // Arrange
      const proposalId = 'prop-123';
      const voterAddress = '0.0.999999';
      jest.spyOn(service, 'findVoterVote').mockRejectedValue(new NotFoundException('Vote not found'));

      // Act & Assert
      await expect(controller.findVoterVote(proposalId, voterAddress)).rejects.toThrow(NotFoundException);
      expect(service.findVoterVote).toHaveBeenCalledWith(proposalId, voterAddress);
    });

    it('should throw InternalServerErrorException for unexpected errors', async () => {
      // Arrange
      const proposalId = 'prop-123';
      const voterAddress = '0.0.123456';
      jest.spyOn(service, 'findVoterVote').mockRejectedValue(new Error('Unexpected error'));
      jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error for test

      // Act & Assert
      await expect(controller.findVoterVote(proposalId, voterAddress)).rejects.toThrow(InternalServerErrorException);
      expect(service.findVoterVote).toHaveBeenCalledWith(proposalId, voterAddress);
    });
  });
}); 