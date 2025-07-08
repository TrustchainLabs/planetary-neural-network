import { Test, TestingModule } from '@nestjs/testing';
import { ProposalController } from './proposal.controller';
import { ProposalService } from './proposal.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { Proposal } from './entities/proposal.entity';
import { ProposalStatus } from './entities/proposal.entity';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';
import { Vote } from '../votes/entities/vote.entity';
import { Types } from 'mongoose';

describe('ProposalController', () => {
  let controller: ProposalController;
  let service: ProposalService;

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
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProposalController],
      providers: [
        {
          provide: ProposalService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findOneWithVotes: jest.fn(),
            findByDao: jest.fn(),
            findActiveByDao: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProposalController>(ProposalController);
    service = module.get<ProposalService>(ProposalService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new proposal', async () => {
      jest.spyOn(service, 'create').mockResolvedValue(mockProposal as Proposal);
      
      const result = await controller.create(mockCreateProposalDto);
      
      expect(result).toEqual(mockProposal);
      expect(service.create).toHaveBeenCalledWith(mockCreateProposalDto);
    });
    
    it('should pass through NotFoundException from service', async () => {
      const notFoundError = new NotFoundException('DAO not found');
      jest.spyOn(service, 'create').mockRejectedValue(notFoundError);
      
      await expect(controller.create(mockCreateProposalDto)).rejects.toThrow(NotFoundException);
    });
    
    it('should handle ValidationError from mongoose', async () => {
      const validationError = new MongooseError.ValidationError();
      validationError.message = 'Validation failed';
      validationError.errors = { field: { message: 'Field is required' } } as any;
      
      jest.spyOn(service, 'create').mockRejectedValue(validationError);
      
      await expect(controller.create(mockCreateProposalDto)).rejects.toThrow(BadRequestException);
    });
    
    it('should handle other validation errors', async () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      
      jest.spyOn(service, 'create').mockRejectedValue(validationError);
      
      await expect(controller.create(mockCreateProposalDto)).rejects.toThrow(BadRequestException);
    });
    
    it('should pass through BadRequestException from service', async () => {
      const badRequestError = new BadRequestException('Invalid data');
      jest.spyOn(service, 'create').mockRejectedValue(badRequestError);
      
      await expect(controller.create(mockCreateProposalDto)).rejects.toThrow(BadRequestException);
    });
    
    it('should convert other errors to InternalServerErrorException', async () => {
      const genericError = new Error('Something went wrong');
      jest.spyOn(service, 'create').mockRejectedValue(genericError);
      
      await expect(controller.create(mockCreateProposalDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('should return an array of proposals', async () => {
      const mockProposals = [mockProposal] as Proposal[];
      jest.spyOn(service, 'findAll').mockResolvedValue(mockProposals);
      
      const result = await controller.findAll();
      
      expect(result).toEqual(mockProposals);
      expect(service.findAll).toHaveBeenCalled();
    });
    
    it('should handle errors and throw InternalServerErrorException', async () => {
      jest.spyOn(service, 'findAll').mockRejectedValue(new Error('Database error'));
      
      await expect(controller.findAll()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOne', () => {
    it('should return a proposal by ID', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProposal as Proposal);
      
      const result = await controller.findOne(mockProposalId);
      
      expect(result).toEqual(mockProposal);
      expect(service.findOne).toHaveBeenCalledWith(mockProposalId);
    });
    
    it('should pass through NotFoundException from service', async () => {
      const notFoundError = new NotFoundException('Proposal not found');
      jest.spyOn(service, 'findOne').mockRejectedValue(notFoundError);
      
      await expect(controller.findOne(mockProposalId)).rejects.toThrow(NotFoundException);
    });
    
    it('should handle errors and throw InternalServerErrorException', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new Error('Database error'));
      
      await expect(controller.findOne(mockProposalId)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOneWithVotes', () => {
    it('should return a proposal with votes by ID', async () => {
      const mockVoteId = new Types.ObjectId();
      
      const mockProposalWithVotes = {
        ...mockProposal,
        votes: [mockVoteId] as unknown as Vote[]
      } as Proposal;
      
      jest.spyOn(service, 'findOneWithVotes').mockResolvedValue(mockProposalWithVotes);
      
      const result = await controller.findOneWithVotes(mockProposalId);
      
      expect(result).toEqual(mockProposalWithVotes);
      expect(service.findOneWithVotes).toHaveBeenCalledWith(mockProposalId);
    });
    
    it('should pass through NotFoundException from service', async () => {
      const notFoundError = new NotFoundException('Proposal not found');
      jest.spyOn(service, 'findOneWithVotes').mockRejectedValue(notFoundError);
      
      await expect(controller.findOneWithVotes(mockProposalId)).rejects.toThrow(NotFoundException);
    });
    
    it('should handle errors and throw InternalServerErrorException', async () => {
      jest.spyOn(service, 'findOneWithVotes').mockRejectedValue(new Error('Database error'));
      
      await expect(controller.findOneWithVotes(mockProposalId)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findByDao', () => {
    it('should return proposals for a DAO', async () => {
      const mockProposals = [mockProposal] as Proposal[];
      jest.spyOn(service, 'findByDao').mockResolvedValue(mockProposals);
      
      const result = await controller.findByDao(mockDaoId);
      
      expect(result).toEqual(mockProposals);
      expect(service.findByDao).toHaveBeenCalledWith(mockDaoId);
    });
    
    it('should pass through NotFoundException from service', async () => {
      const notFoundError = new NotFoundException('DAO not found');
      jest.spyOn(service, 'findByDao').mockRejectedValue(notFoundError);
      
      await expect(controller.findByDao(mockDaoId)).rejects.toThrow(NotFoundException);
    });
    
    it('should handle errors and throw InternalServerErrorException', async () => {
      jest.spyOn(service, 'findByDao').mockRejectedValue(new Error('Database error'));
      
      await expect(controller.findByDao(mockDaoId)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findActiveByDao', () => {
    it('should return active proposals for a DAO', async () => {
      const mockActiveProposals = [mockProposal] as Proposal[];
      jest.spyOn(service, 'findActiveByDao').mockResolvedValue(mockActiveProposals);
      
      const result = await controller.findActiveByDao(mockDaoId);
      
      expect(result).toEqual(mockActiveProposals);
      expect(service.findActiveByDao).toHaveBeenCalledWith(mockDaoId);
    });
    
    it('should pass through NotFoundException from service', async () => {
      const notFoundError = new NotFoundException('DAO not found');
      jest.spyOn(service, 'findActiveByDao').mockRejectedValue(notFoundError);
      
      await expect(controller.findActiveByDao(mockDaoId)).rejects.toThrow(NotFoundException);
    });
    
    it('should handle errors and throw InternalServerErrorException', async () => {
      jest.spyOn(service, 'findActiveByDao').mockRejectedValue(new Error('Database error'));
      
      await expect(controller.findActiveByDao(mockDaoId)).rejects.toThrow(InternalServerErrorException);
    });
  });
}); 