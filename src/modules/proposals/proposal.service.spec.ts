import { Test, TestingModule } from '@nestjs/testing';
import { ProposalService } from './proposal.service';
import { ProposalModelService } from './proposal.model.service';
import { getQueueToken } from '@nestjs/bull';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Proposal } from './entities/proposal.entity';
import { ProposalStatus } from './entities/proposal.entity';

describe('ProposalService', () => {
  let service: ProposalService;
  let modelService: ProposalModelService;
  let mockQueue: any;

  // Mock data
  const mockProposalId = '61dbae02c35ff68a564aafe0';
  const mockDaoId = '61dbae02c35ff68a564aafe1';
  
  const mockCreateProposalDto: CreateProposalDto = {
    daoId: mockDaoId,
    title: 'Test Proposal',
    description: 'Test Description',
    creatorAddress: '0x1234567890',
    votingDurationHours: 24,
    proposalData: {},
    votingOptions: ['YES', 'NO', 'ABSTAIN']
  };
  
  const mockProposal: Partial<Proposal> = {
    proposalId: mockProposalId,
    daoId: mockDaoId,
    title: 'Test Proposal',
    description: 'Test Description',
    creatorAddress: '0x1234567890',
    status: ProposalStatus.ACTIVE,
    votes: [],
    startTime: new Date(),
    endTime: new Date(Date.now() + 86400000),
    proposalData: {}
  };

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalService,
        {
          provide: ProposalModelService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findOneWithVotes: jest.fn(),
            findByDao: jest.fn(),
            findActiveByDao: jest.fn(),
            processExpiredProposals: jest.fn()
          },
        },
        {
          provide: getQueueToken('dao'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<ProposalService>(ProposalService);
    modelService = module.get<ProposalModelService>(ProposalModelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a proposal and add a job to the queue', async () => {
      // Mock model service to return the created proposal
      jest.spyOn(modelService, 'create').mockResolvedValue(mockProposal as Proposal);
      
      const result = await service.create(mockCreateProposalDto);
      
      expect(result).toEqual(mockProposal);
      expect(modelService.create).toHaveBeenCalledWith(mockCreateProposalDto);
      expect(mockQueue.add).toHaveBeenCalledWith('process-proposal-creation', {
        proposalId: mockProposal.proposalId,
        daoId: mockProposal.daoId,
        creatorAddress: mockProposal.creatorAddress
      }, expect.any(Object));
    });
    
    it('should pass through validation errors', async () => {
      // Mock model service to throw a validation error
      const validationError = new BadRequestException('Validation failed');
      jest.spyOn(modelService, 'create').mockRejectedValue(validationError);
      
      await expect(service.create(mockCreateProposalDto)).rejects.toThrow(BadRequestException);
      expect(modelService.create).toHaveBeenCalledWith(mockCreateProposalDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of proposals', async () => {
      const mockProposals = [mockProposal];
      jest.spyOn(modelService, 'findAll').mockResolvedValue(mockProposals as Proposal[]);
      
      const result = await service.findAll();
      
      expect(result).toEqual(mockProposals);
      expect(modelService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a proposal when it exists', async () => {
      jest.spyOn(modelService, 'findOne').mockResolvedValue(mockProposal as Proposal);
      
      const result = await service.findOne(mockProposalId);
      
      expect(result).toEqual(mockProposal);
      expect(modelService.findOne).toHaveBeenCalledWith(mockProposalId);
    });
    
    it('should throw NotFoundException when proposal does not exist', async () => {
      jest.spyOn(modelService, 'findOne').mockResolvedValue(null);
      
      await expect(service.findOne(mockProposalId)).rejects.toThrow(NotFoundException);
      expect(modelService.findOne).toHaveBeenCalledWith(mockProposalId);
    });
  });

  describe('findOneWithVotes', () => {
    it('should return a proposal with votes when it exists', async () => {
      const mockProposalWithVotes = {
        ...mockProposal,
        votes: []
      };
      
      jest.spyOn(modelService, 'findOneWithVotes').mockResolvedValue(mockProposalWithVotes as Proposal);
      
      const result = await service.findOneWithVotes(mockProposalId);
      
      expect(result).toEqual(mockProposalWithVotes);
      expect(modelService.findOneWithVotes).toHaveBeenCalledWith(mockProposalId);
    });
    
    it('should return null when proposal does not exist', async () => {
      jest.spyOn(modelService, 'findOneWithVotes').mockResolvedValue(null);
      
      const result = await service.findOneWithVotes(mockProposalId);
      expect(result).toBeNull();
      expect(modelService.findOneWithVotes).toHaveBeenCalledWith(mockProposalId);
    });
  });

  describe('findByDao', () => {
    it('should return proposals for a DAO', async () => {
      const mockProposals = [mockProposal];
      jest.spyOn(modelService, 'findByDao').mockResolvedValue(mockProposals as Proposal[]);
      
      const result = await service.findByDao(mockDaoId);
      
      expect(result).toEqual(mockProposals);
      expect(modelService.findByDao).toHaveBeenCalledWith(mockDaoId);
    });
  });

  describe('findActiveByDao', () => {
    it('should return active proposals for a DAO', async () => {
      const mockActiveProposals = [mockProposal];
      jest.spyOn(modelService, 'findActiveByDao').mockResolvedValue(mockActiveProposals as Proposal[]);
      
      const result = await service.findActiveByDao(mockDaoId);
      
      expect(result).toEqual(mockActiveProposals);
      expect(modelService.findActiveByDao).toHaveBeenCalledWith(mockDaoId);
    });
  });
  
  describe('processExpiredProposals', () => {
    it('should add a job to the queue to process expired proposals', async () => {
      await service.processExpiredProposals();
      
      expect(mockQueue.add).toHaveBeenCalledWith('process-expired-proposals', {}, expect.any(Object));
    });
  });
}); 