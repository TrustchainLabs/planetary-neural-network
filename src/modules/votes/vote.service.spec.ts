/**
 * @file vote.service.spec.ts
 * @description Test suite for the VoteService
 * 
 * This file contains comprehensive tests for the VoteService, covering
 * all business logic operations and interactions with the model service
 * and background processing queue.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { VoteService } from './vote.service';
import { VoteModelService } from './vote.model.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { Vote, VoteChoice } from './entities/vote.entity';
import { ProposalStatus } from '../proposals/entities/proposal.entity';
import { ProposalModelService } from '../proposals/proposal.model.service';
import { DaoModelService } from '../daos/dao.model.service';

describe('VoteService', () => {
  let service: VoteService;
  let voteModelService: VoteModelService;
  let proposalModelService: ProposalModelService;
  let daoModelService: DaoModelService;
  let queueMock: any;

  beforeEach(async () => {
    // Create mock implementations
    const voteModelServiceMock = {
      create: jest.fn(),
      findOne: jest.fn(),
      findByProposal: jest.fn(),
      findVoterVote: jest.fn(),
      countVotesByChoice: jest.fn(),
      hasVoted: jest.fn(),
      findOneWithVotes: jest.fn(),
    };

    const proposalModelServiceMock = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const daoModelServiceMock = {
      findOne: jest.fn(),
      isMember: jest.fn(),
    };

    queueMock = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteService,
        {
          provide: VoteModelService,
          useValue: voteModelServiceMock,
        },
        {
          provide: ProposalModelService,
          useValue: proposalModelServiceMock,
        },
        {
          provide: DaoModelService,
          useValue: daoModelServiceMock,
        },
        {
          provide: getQueueToken('dao'),
          useValue: queueMock,
        },
      ],
    }).compile();

    service = module.get<VoteService>(VoteService);
    voteModelService = module.get<VoteModelService>(VoteModelService);
    proposalModelService = module.get<ProposalModelService>(ProposalModelService);
    daoModelService = module.get<DaoModelService>(DaoModelService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test vote creation
   */
  describe('create', () => {
    it('should create a vote when all conditions are met', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123', 
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      // Mock proposal that is active
      const mockProposal = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        status: ProposalStatus.ACTIVE,
        endTime: new Date(Date.now() + 86400000), // 1 day from now
        votingOptions: ['YES', 'NO', 'ABSTAIN']
      };
      
      // Mock DAO with the voter as a member
      const mockDao = {
        daoId: 'dao-123',
        name: 'Test DAO'
      };

      // Mock created vote
      const mockVote = {
        voteId: 'vote-123',
        proposalId: createVoteDto.proposalId,
        daoId: createVoteDto.daoId,
        voterAddress: createVoteDto.voterAddress,
        choice: createVoteDto.choice,
        weight: 1,
        proposal: new Types.ObjectId(),
        dao: new Types.ObjectId()
      };

      // Configure mock responses
      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(mockProposal as any);
      jest.spyOn(daoModelService, 'findOne').mockResolvedValue(mockDao as any);
      jest.spyOn(daoModelService, 'isMember').mockResolvedValue(true);
      
      // Explicitly add findVoterVote method to the mock implementation (to check if already voted)
      jest.spyOn(voteModelService, 'findVoterVote').mockResolvedValue(null);
      
      jest.spyOn(voteModelService, 'create').mockResolvedValue(mockVote as unknown as Vote);

      // Act
      const result = await service.create(createVoteDto);

      // Assert
      expect(result).toBe(mockVote);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(createVoteDto.proposalId);
      expect(voteModelService.create).toHaveBeenCalledWith(createVoteDto);
      expect(queueMock.add).toHaveBeenCalledWith(
        'process-vote-creation',
        {
          voteId: mockVote.voteId,
          proposalId: createVoteDto.proposalId,
          daoId: createVoteDto.daoId,
          voterAddress: createVoteDto.voterAddress,
          choice: createVoteDto.choice
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

    it('should throw NotFoundException when proposal does not exist', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'non-existent-prop',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(NotFoundException);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(createVoteDto.proposalId);
      expect(voteModelService.create).not.toHaveBeenCalled();
      expect(queueMock.add).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when proposal is not active', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      // Mock proposal that is not active
      const mockProposal = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        status: ProposalStatus.PASSED, // Not ACTIVE
        endTime: new Date(Date.now() + 86400000),
        votingOptions: ['YES', 'NO', 'ABSTAIN']
      };

      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(mockProposal as any);

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(BadRequestException);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(createVoteDto.proposalId);
      expect(voteModelService.create).not.toHaveBeenCalled();
      expect(queueMock.add).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when voting period has ended', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      // Mock proposal with past end time
      const mockProposal = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        status: ProposalStatus.ACTIVE,
        endTime: new Date(Date.now() - 86400000), // 1 day ago
        votingOptions: ['YES', 'NO', 'ABSTAIN']
      };

      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(mockProposal as any);

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(BadRequestException);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(createVoteDto.proposalId);
      expect(voteModelService.create).not.toHaveBeenCalled();
      expect(queueMock.add).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when DAO does not exist', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      // Mock active proposal
      const mockProposal = {
        proposalId: 'prop-123',
        daoId: 'non-existent-dao',
        status: ProposalStatus.ACTIVE,
        endTime: new Date(Date.now() + 86400000)
      };

      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(mockProposal as any);
      jest.spyOn(daoModelService, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(NotFoundException);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(createVoteDto.proposalId);
      expect(daoModelService.findOne).toHaveBeenCalledWith(mockProposal.daoId);
      expect(voteModelService.create).not.toHaveBeenCalled();
      expect(queueMock.add).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when voter is not a DAO member', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      // Mock active proposal
      const mockProposal = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        status: ProposalStatus.ACTIVE,
        endTime: new Date(Date.now() + 86400000)
      };

      // Mock DAO
      const mockDao = {
        daoId: 'dao-123',
        name: 'Test DAO'
      };

      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(mockProposal as any);
      jest.spyOn(daoModelService, 'findOne').mockResolvedValue(mockDao as any);
      jest.spyOn(daoModelService, 'isMember').mockResolvedValue(false); // Not a member

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(BadRequestException);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(createVoteDto.proposalId);
      expect(daoModelService.findOne).toHaveBeenCalledWith(mockProposal.daoId);
      expect(daoModelService.isMember).toHaveBeenCalledWith(mockProposal.daoId, createVoteDto.voterAddress);
      expect(voteModelService.create).not.toHaveBeenCalled();
      expect(queueMock.add).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user has already voted', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      // Mock active proposal
      const mockProposal = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        status: ProposalStatus.ACTIVE,
        endTime: new Date(Date.now() + 86400000),
        votingOptions: ['YES', 'NO', 'ABSTAIN']
      };

      // Mock DAO with the voter as a member
      const mockDao = {
        daoId: 'dao-123',
        name: 'Test DAO'
      };

      // Mock existing vote to indicate the user has already voted
      const existingVote = {
        voteId: 'vote-existing',
        proposalId: createVoteDto.proposalId,
        voterAddress: createVoteDto.voterAddress
      };

      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(mockProposal as any);
      jest.spyOn(daoModelService, 'findOne').mockResolvedValue(mockDao as any);
      jest.spyOn(daoModelService, 'isMember').mockResolvedValue(true);
      
      // User has already voted
      jest.spyOn(voteModelService, 'findVoterVote').mockResolvedValue(existingVote as unknown as Vote);

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(ConflictException);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(createVoteDto.proposalId);
      expect(daoModelService.findOne).toHaveBeenCalledWith(mockProposal.daoId);
      expect(daoModelService.isMember).toHaveBeenCalledWith(mockProposal.daoId, createVoteDto.voterAddress);
      expect(voteModelService.findVoterVote).toHaveBeenCalledWith(createVoteDto.proposalId, createVoteDto.voterAddress);
      expect(voteModelService.create).not.toHaveBeenCalled();
      expect(queueMock.add).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when choice is not in allowed voting options', async () => {
      // Arrange
      const createVoteDto: CreateVoteDto = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        voterAddress: '0.0.123456',
        choice: 'INVALID_CHOICE'
      };

      // Mock proposal with specific voting options
      const mockProposal = {
        proposalId: 'prop-123',
        daoId: 'dao-123',
        status: ProposalStatus.ACTIVE,
        endTime: new Date(Date.now() + 86400000),
        votingOptions: ['YES', 'NO', 'ABSTAIN'] // INVALID_CHOICE is not included
      };
      
      // Mock DAO with the voter as a member
      const mockDao = {
        daoId: 'dao-123',
        name: 'Test DAO'
      };

      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(mockProposal as any);
      jest.spyOn(daoModelService, 'findOne').mockResolvedValue(mockDao as any);
      jest.spyOn(daoModelService, 'isMember').mockResolvedValue(true);
      
      // No existing vote
      jest.spyOn(voteModelService, 'findVoterVote').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(BadRequestException);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(createVoteDto.proposalId);
      expect(daoModelService.findOne).toHaveBeenCalledWith(mockProposal.daoId);
      expect(daoModelService.isMember).toHaveBeenCalledWith(mockProposal.daoId, createVoteDto.voterAddress);
      expect(voteModelService.findVoterVote).toHaveBeenCalledWith(createVoteDto.proposalId, createVoteDto.voterAddress);
      expect(voteModelService.create).not.toHaveBeenCalled();
      expect(queueMock.add).not.toHaveBeenCalled();
    });
  });

  /**
   * Test findOne method
   */
  describe('findOne', () => {
    it('should return a specific vote by ID', async () => {
      // Arrange
      const voteId = 'test-vote-1';
      const expectedVote = { voteId, voterAddress: '0.0.123456' } as Vote;
      
      jest.spyOn(voteModelService, 'findOne').mockResolvedValue(expectedVote);
      
      // Act
      const result = await service.findOne(voteId);
      
      // Assert
      expect(result).toBe(expectedVote);
      expect(voteModelService.findOne).toHaveBeenCalledWith(voteId);
    });

    it('should throw NotFoundException when vote is not found', async () => {
      // Arrange
      const voteId = 'non-existent-vote';
      
      // Mock the voteModelService to return null (vote not found)
      jest.spyOn(voteModelService, 'findOne').mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.findOne(voteId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(voteId)).rejects.toThrow(`Vote with ID ${voteId} not found`);
      expect(voteModelService.findOne).toHaveBeenCalledWith(voteId);
    });
  });

  /**
   * Test findOneWithVotes method
   */
  describe('findOneWithVotes', () => {
    it('should call voteModelService.findOneWithVotes and return the result', async () => {
      // Arrange
      const voteId = 'test-vote-1';
      const expectedVote = { 
        voteId, 
        voterAddress: '0.0.123456',
        proposal: {
          title: 'Test Proposal'
        }
      } as Vote;
      
      jest.spyOn(voteModelService, 'findOneWithVotes').mockResolvedValue(expectedVote);
      
      // Act
      const result = await service.findOneWithVotes(voteId);
      
      // Assert
      expect(result).toBe(expectedVote);
      expect(voteModelService.findOneWithVotes).toHaveBeenCalledWith(voteId);
    });
    
    it('should pass through any errors from voteModelService.findOneWithVotes', async () => {
      // Arrange
      const voteId = 'test-vote-1';
      const expectedError = new NotFoundException('Vote not found');
      
      jest.spyOn(voteModelService, 'findOneWithVotes').mockRejectedValue(expectedError);
      
      // Act & Assert
      await expect(service.findOneWithVotes(voteId)).rejects.toThrow(expectedError);
      expect(voteModelService.findOneWithVotes).toHaveBeenCalledWith(voteId);
    });
  });

  /**
   * Test findByProposal method
   */
  describe('findByProposal', () => {
    it('should return votes for a specific proposal', async () => {
      // Arrange
      const proposalId = 'prop-123';
      const mockVotes = [
        {
          voteId: 'vote-1',
          proposalId,
          voterAddress: '0.0.123456',
          choice: 'YES'
        },
        {
          voteId: 'vote-2',
          proposalId,
          voterAddress: '0.0.789012',
          choice: 'NO'
        }
      ];

      jest.spyOn(voteModelService, 'findByProposal').mockResolvedValue(mockVotes as unknown as Vote[]);

      // Act
      const result = await service.findByProposal(proposalId);

      // Assert
      expect(result).toBe(mockVotes);
      expect(voteModelService.findByProposal).toHaveBeenCalledWith(proposalId);
    });
  });

  /**
   * Test findVoterVote method
   */
  describe('findVoterVote', () => {
    it('should return a specific vote by proposal and voter', async () => {
      // Arrange
      const proposalId = 'prop-123';
      const voterAddress = '0.0.123456';
      const mockVote = {
        voteId: 'vote-123',
        proposalId,
        voterAddress,
        choice: 'YES'
      };

      jest.spyOn(voteModelService, 'findVoterVote').mockResolvedValue(mockVote as unknown as Vote);

      // Act
      const result = await service.findVoterVote(proposalId, voterAddress);

      // Assert
      expect(result).toBe(mockVote);
      expect(voteModelService.findVoterVote).toHaveBeenCalledWith(proposalId, voterAddress);
    });

    it('should return null when no vote is found', async () => {
      // Arrange
      const proposalId = 'prop-123';
      const voterAddress = '0.0.123456';
      jest.spyOn(voteModelService, 'findVoterVote').mockResolvedValue(null);

      // Act
      const result = await service.findVoterVote(proposalId, voterAddress);

      // Assert
      expect(result).toBeNull();
      expect(voteModelService.findVoterVote).toHaveBeenCalledWith(proposalId, voterAddress);
    });
  });

  /**
   * Test countVotesByChoice method
   */
  describe('countVotesByChoice', () => {
    it('should return vote counts by choice', async () => {
      // Arrange
      const proposalId = 'prop-123';
      const mockVotes = [
        { choice: 'YES', weight: 1 },
        { choice: 'YES', weight: 1 },
        { choice: 'NO', weight: 1 },
        { choice: 'ABSTAIN', weight: 1 }
      ];

      const mockProposal = {
        proposalId,
        votingOptions: ['YES', 'NO', 'ABSTAIN']
      };

      jest.spyOn(voteModelService, 'findByProposal').mockResolvedValue(mockVotes as unknown as Vote[]);
      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(mockProposal as any);

      // Act
      const result = await service.countVotesByChoice(proposalId);

      // Assert
      expect(result).toEqual({
        YES: 2,
        NO: 1,
        ABSTAIN: 1
      });
      expect(voteModelService.findByProposal).toHaveBeenCalledWith(proposalId);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(proposalId);
    });

    it('should throw NotFoundException when proposal does not exist', async () => {
      // Arrange
      const proposalId = 'non-existent-proposal';
      
      jest.spyOn(voteModelService, 'findByProposal').mockResolvedValue([] as unknown as Vote[]);
      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.countVotesByChoice(proposalId)).rejects.toThrow(NotFoundException);
      await expect(service.countVotesByChoice(proposalId)).rejects.toThrow(`Proposal with ID ${proposalId} not found`);
      
      expect(voteModelService.findByProposal).toHaveBeenCalledWith(proposalId);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(proposalId);
    });

    it('should handle votes with undefined weight by using default weight of 1', async () => {
      // Arrange
      const proposalId = 'prop-123';
      const mockVotes = [
        { choice: 'YES', weight: undefined }, // Explicit undefined weight
        { choice: 'YES', weight: 1 },
        { choice: 'NO' } // Implicit undefined weight
      ];

      const mockProposal = {
        proposalId,
        votingOptions: ['YES', 'NO', 'ABSTAIN']
      };

      jest.spyOn(voteModelService, 'findByProposal').mockResolvedValue(mockVotes as unknown as Vote[]);
      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(mockProposal as any);

      // Act
      const result = await service.countVotesByChoice(proposalId);

      // Assert
      expect(result).toEqual({
        YES: 2, // 1 (default) + 1 (explicit) = 2
        NO: 1,  // 1 (default)
        ABSTAIN: 0
      });
      expect(voteModelService.findByProposal).toHaveBeenCalledWith(proposalId);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(proposalId);
    });
  });
}); 