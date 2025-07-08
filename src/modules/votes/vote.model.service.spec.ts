/**
 * @file vote.model.service.spec.ts
 * @description Test suite for the VoteModelService
 *
 * This file contains comprehensive tests for the VoteModelService methods,
 * ensuring proper data operations, validation rules, and business logic for
 * managing votes on proposals within DAOs.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VoteModelService } from './vote.model.service';
import { Vote, VoteDocument, VoteChoice } from './entities/vote.entity';
import { CreateVoteDto } from './dto/create-vote.dto';
import { DaoModelService } from '../daos/dao.model.service';
import { ProposalModelService } from '../proposals/proposal.model.service';
import { ProposalStatus } from '../proposals/entities/proposal.entity';

describe('VoteModelService', () => {
  let service: VoteModelService;
  let voteModel: Model<VoteDocument>;
  let daoModelService: DaoModelService;
  let proposalModelService: ProposalModelService;

  // Mock data
  const mockDao = {
    _id: new Types.ObjectId(),
    daoId: 'dao-123',
    name: 'Test DAO',
    votingRules: {
      threshold: 51, // 51% threshold to pass
    },
  };

  const mockProposal = {
    _id: new Types.ObjectId(),
    proposalId: 'prop-123',
    daoId: 'dao-123',
    dao: mockDao._id,
    title: 'Test Proposal',
    status: ProposalStatus.ACTIVE,
    endTime: new Date(Date.now() + 86400000), // 1 day from now
    votingOptions: [VoteChoice.YES, VoteChoice.NO, VoteChoice.ABSTAIN],
  };

  const mockVote = {
    _id: new Types.ObjectId(),
    voteId: 'vote-123',
    proposalId: 'prop-123',
    proposal: mockProposal._id,
    daoId: 'dao-123',
    dao: mockDao._id,
    voterAddress: '0.0.123456',
    choice: VoteChoice.YES,
    weight: 1,
    comment: 'Test comment',
    save: jest.fn().mockResolvedValue(this),
  };

  const createVoteDto: CreateVoteDto = {
    proposalId: 'prop-123',
    daoId: 'dao-123',
    voterAddress: '0.0.123456',
    choice: VoteChoice.YES,
    comment: 'Test comment',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteModelService,
        {
          provide: getModelToken(Vote.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockVote),
            constructor: jest.fn().mockResolvedValue(mockVote),
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            exec: jest.fn(),
            aggregate: jest.fn(),
            populate: jest.fn(),
          },
        },
        {
          provide: DaoModelService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ProposalModelService,
          useValue: {
            findOne: jest.fn(),
            addVote: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VoteModelService>(VoteModelService);
    voteModel = module.get<Model<VoteDocument>>(getModelToken(Vote.name));
    daoModelService = module.get<DaoModelService>(DaoModelService);
    proposalModelService = module.get<ProposalModelService>(ProposalModelService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new vote', async () => {
      // Arrange
      jest.spyOn(daoModelService, 'findOne').mockResolvedValue(mockDao as any);
      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(mockProposal as any);
      jest.spyOn(service, 'findVoterVote').mockResolvedValue(null); // No existing vote
      jest.spyOn(service, 'checkProposalStatus').mockResolvedValue();
      
      // Mock the create method instead of 'new'
      const mockSavedVote = {
        ...mockVote,
        _id: new Types.ObjectId(),
      };
      jest.spyOn(voteModel, 'create').mockResolvedValue(mockSavedVote as any);
      jest.spyOn(proposalModelService, 'addVote').mockResolvedValue(mockProposal as any);

      // Act
      const result = await service.create(createVoteDto);

      // Assert
      expect(daoModelService.findOne).toHaveBeenCalledWith(createVoteDto.daoId);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(createVoteDto.proposalId);
      expect(service.findVoterVote).toHaveBeenCalledWith(
        createVoteDto.proposalId,
        createVoteDto.voterAddress
      );
      expect(voteModel.create).toHaveBeenCalled();
      expect(proposalModelService.addVote).toHaveBeenCalled();
      expect(service.checkProposalStatus).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect((result as unknown as VoteDocument)._id).toEqual(mockSavedVote._id);
    });

    it('should throw NotFoundException when DAO not found', async () => {
      // Arrange
      jest.spyOn(daoModelService, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(NotFoundException);
      expect(daoModelService.findOne).toHaveBeenCalledWith(createVoteDto.daoId);
    });

    it('should throw NotFoundException when proposal not found', async () => {
      // Arrange
      jest.spyOn(daoModelService, 'findOne').mockResolvedValue(mockDao as any);
      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(NotFoundException);
      expect(proposalModelService.findOne).toHaveBeenCalledWith(createVoteDto.proposalId);
    });

    it('should throw BadRequestException when proposal doesn\'t belong to DAO', async () => {
      // Arrange
      const differentDaoProposal = {
        ...mockProposal,
        daoId: 'different-dao',
      };
      jest.spyOn(daoModelService, 'findOne').mockResolvedValue(mockDao as any);
      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(differentDaoProposal as any);

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when proposal is not active', async () => {
      // Arrange
      const inactiveProposal = {
        ...mockProposal,
        status: ProposalStatus.PASSED,
      };
      jest.spyOn(daoModelService, 'findOne').mockResolvedValue(mockDao as any);
      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(inactiveProposal as any);

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when voting period has ended', async () => {
      // Arrange
      const pastEndTimeProposal = {
        ...mockProposal,
        endTime: new Date(Date.now() - 86400000), // 1 day ago
      };
      jest.spyOn(daoModelService, 'findOne').mockResolvedValue(mockDao as any);
      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(pastEndTimeProposal as any);

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when voter has already voted', async () => {
      // Arrange
      jest.spyOn(daoModelService, 'findOne').mockResolvedValue(mockDao as any);
      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(mockProposal as any);
      jest.spyOn(service, 'findVoterVote').mockResolvedValue(mockVote as any);

      // Act & Assert
      await expect(service.create(createVoteDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return an array of votes', async () => {
      // Arrange
      const mockVotes = [mockVote, mockVote];
      jest.spyOn(voteModel, 'find').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVotes),
      } as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(voteModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockVotes);
    });
  });

  describe('findOne', () => {
    it('should return a vote when found', async () => {
      // Arrange
      jest.spyOn(voteModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVote),
      } as any);

      // Act
      const result = await service.findOne('vote-123');

      // Assert
      expect(voteModel.findOne).toHaveBeenCalledWith({ voteId: 'vote-123' });
      expect(result).toEqual(mockVote);
    });

    it('should throw NotFoundException when vote not found', async () => {
      // Arrange
      jest.spyOn(voteModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Act & Assert
      await expect(service.findOne('non-existent-vote')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneWithVotes', () => {
    it('should return a vote with populated relationships', async () => {
      // Arrange
      const populateDaoMock = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockVote),
      };
      const populateProposalMock = {
        populate: jest.fn().mockReturnValue(populateDaoMock),
      };
      jest.spyOn(voteModel, 'findOne').mockReturnValue(populateProposalMock as any);

      // Act
      const result = await service.findOneWithVotes('vote-123');

      // Assert
      expect(voteModel.findOne).toHaveBeenCalledWith({ voteId: 'vote-123' });
      expect(populateProposalMock.populate).toHaveBeenCalledWith('proposal');
      expect(populateDaoMock.populate).toHaveBeenCalledWith('dao');
      expect(result).toEqual(mockVote);
    });

    it('should throw NotFoundException when vote not found', async () => {
      // Arrange
      const populateDaoMock = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      const populateProposalMock = {
        populate: jest.fn().mockReturnValue(populateDaoMock),
      };
      jest.spyOn(voteModel, 'findOne').mockReturnValue(populateProposalMock as any);

      // Act & Assert
      await expect(service.findOneWithVotes('non-existent-vote')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findByProposal', () => {
    it('should return votes for a proposal', async () => {
      // Arrange
      const mockVotes = [mockVote, mockVote];
      jest.spyOn(voteModel, 'find').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVotes),
      } as any);

      // Act
      const result = await service.findByProposal('prop-123');

      // Assert
      expect(voteModel.find).toHaveBeenCalledWith({ proposalId: 'prop-123' });
      expect(result).toEqual(mockVotes);
    });
  });

  describe('findVoterVote', () => {
    it('should return a voter\'s vote when found', async () => {
      // Arrange
      jest.spyOn(voteModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVote),
      } as any);

      // Act
      const result = await service.findVoterVote('prop-123', '0.0.123456');

      // Assert
      expect(voteModel.findOne).toHaveBeenCalledWith({
        proposalId: 'prop-123',
        voterAddress: '0.0.123456',
      });
      expect(result).toEqual(mockVote);
    });

    it('should return null when vote not found', async () => {
      // Arrange
      jest.spyOn(voteModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Act
      const result = await service.findVoterVote('prop-123', '0.0.nonvoter');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('countVotesByChoice', () => {
    it('should count votes by choice', async () => {
      // Arrange
      const mockAggregationResults = [
        { _id: VoteChoice.YES, count: 5 },
        { _id: VoteChoice.NO, count: 3 },
      ];
      jest.spyOn(voteModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregationResults),
      } as any);
      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue({
        ...mockProposal,
        votingOptions: [VoteChoice.YES, VoteChoice.NO, VoteChoice.ABSTAIN],
      } as any);

      // Act
      const result = await service.countVotesByChoice('prop-123');

      // Assert
      expect(voteModel.aggregate).toHaveBeenCalledWith([
        { $match: { proposalId: 'prop-123' } },
        {
          $group: {
            _id: '$choice',
            count: { $sum: '$weight' },
          },
        },
      ]);
      expect(result).toEqual({
        [VoteChoice.YES]: 5,
        [VoteChoice.NO]: 3,
        [VoteChoice.ABSTAIN]: 0,
      });
    });

    it('should throw NotFoundException when proposal not found', async () => {
      // Arrange
      jest.spyOn(voteModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      jest.spyOn(proposalModelService, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.countVotesByChoice('non-existent-proposal')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('checkProposalStatus', () => {
    it('should update proposal status to PASSED when threshold is met', async () => {
      // Arrange
      jest.spyOn(service, 'countVotesByChoice').mockResolvedValue({
        [VoteChoice.YES]: 6,
        [VoteChoice.NO]: 3,
        [VoteChoice.ABSTAIN]: 1,
      });
      jest.spyOn(proposalModelService, 'updateStatus').mockResolvedValue({} as any);

      // Act
      await service.checkProposalStatus('prop-123', 50);

      // Assert
      expect(service.countVotesByChoice).toHaveBeenCalledWith('prop-123');
      expect(proposalModelService.updateStatus).toHaveBeenCalledWith(
        'prop-123',
        ProposalStatus.PASSED
      );
    });

    it('should update proposal status to REJECTED when threshold cannot be met', async () => {
      // Arrange
      jest.spyOn(service, 'countVotesByChoice').mockResolvedValue({
        [VoteChoice.YES]: 2,
        [VoteChoice.NO]: 8,
        [VoteChoice.ABSTAIN]: 0,
      });
      jest.spyOn(proposalModelService, 'updateStatus').mockResolvedValue({} as any);

      // Act
      await service.checkProposalStatus('prop-123', 50);

      // Assert
      expect(service.countVotesByChoice).toHaveBeenCalledWith('prop-123');
      expect(proposalModelService.updateStatus).toHaveBeenCalledWith(
        'prop-123',
        ProposalStatus.REJECTED
      );
    });

    it('should not update proposal status when neither condition is met', async () => {
      // Arrange
      jest.spyOn(service, 'countVotesByChoice').mockResolvedValue({
        [VoteChoice.YES]: 4,
        [VoteChoice.NO]: 4,
        [VoteChoice.ABSTAIN]: 2,
      });
      jest.spyOn(proposalModelService, 'updateStatus').mockResolvedValue({} as any);

      // Act
      await service.checkProposalStatus('prop-123', 50);

      // Assert
      expect(service.countVotesByChoice).toHaveBeenCalledWith('prop-123');
      expect(proposalModelService.updateStatus).not.toHaveBeenCalled();
    });

    it('should do nothing when there are no votes', async () => {
      // Arrange
      jest.spyOn(service, 'countVotesByChoice').mockResolvedValue({
        [VoteChoice.YES]: 0,
        [VoteChoice.NO]: 0,
        [VoteChoice.ABSTAIN]: 0,
      });
      jest.spyOn(proposalModelService, 'updateStatus').mockResolvedValue({} as any);

      // Act
      await service.checkProposalStatus('prop-123', 50);

      // Assert
      expect(proposalModelService.updateStatus).not.toHaveBeenCalled();
    });
  });
}); 