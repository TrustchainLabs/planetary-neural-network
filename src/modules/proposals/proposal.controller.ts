/**
 * @module ProposalController
 * @description Controller handling proposal management API endpoints
 * 
 * This module provides the REST API endpoints for creating and managing
 * proposals within DAOs. It exposes operations for creating proposals,
 * retrieving proposal information, and querying proposals by various criteria.
 * The controller delegates business logic to the ProposalService.
 */
import { 
  Body, 
  Controller, 
  Get, 
  Param, 
  Post, 
  HttpCode, 
  HttpStatus, 
  BadRequestException, 
  NotFoundException, 
  InternalServerErrorException,
  ValidationPipe
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProposalService } from './proposal.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { Proposal } from './entities/proposal.entity';
import { Error as MongooseError } from 'mongoose';
/**
 * @class ProposalController
 * @description Controller for proposal-related API endpoints
 * 
 * The ProposalController exposes REST API endpoints for managing proposals
 * within Decentralized Autonomous Organizations (DAOs). It provides operations
 * for creating proposals, querying existing proposals, and retrieving detailed
 * information about proposals including their current status and related entities.
 * 
 * The controller integrates with authentication mechanisms to ensure that
 * only authorized users can create new proposals.
 */
@ApiTags('proposals')
@Controller('proposals')
export class ProposalController {
  /**
   * @constructor
   * @description Creates a new instance of ProposalController
   * 
   * @param {ProposalService} proposalService - Service for proposal business logic
   */
  constructor(private readonly proposalService: ProposalService) {}

  /**
   * @method create
   * @description Creates a new proposal for a DAO
   * 
   * This method handles the creation of a new proposal within a DAO. It requires
   * authentication and validates that the request comes from an authorized member
   * of the DAO. The method delegates the actual creation logic to the ProposalService.
   * 
   * The created proposal will start in ACTIVE status and will be open for voting
   * based on the DAO's voting rules.
   * 
   * @param {CreateProposalDto} createProposalDto - Data for the new proposal
   * @returns {Promise<Proposal>} The created proposal entity
   * 
   * @throws {BadRequestException} If validation fails or proposal constraints are violated
   * @throws {NotFoundException} If the referenced DAO does not exist
   * @throws {InternalServerErrorException} If there's an unexpected error during creation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new proposal' })
  @ApiResponse({ 
    status: 201, 
    description: 'The proposal has been successfully created.',
    type: Proposal
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or proposal constraints violated.' })
  @ApiResponse({ status: 404, description: 'DAO not found.' })
  async create(@Body(new ValidationPipe()) createProposalDto: CreateProposalDto): Promise<Proposal> {
    try {
      return await this.proposalService.create(createProposalDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException({
          message: 'Validation failed',
          details: error.message,
          errors: error.errors
        });
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException({
          message: 'Validation failed',
          details: error.message
        });
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create proposal');
    }
  }

  /**
   * @method findAll
   * @description Retrieves all proposals across all DAOs
   * 
   * This method fetches all proposal entities from the system. It is primarily
   * for administrative use and can be paginated or filtered in future extensions.
   * 
   * @returns {Promise<Proposal[]>} Array of all proposals in the system
   * 
   * @throws {InternalServerErrorException} If there's an unexpected error during retrieval
   */
  @Get()
  @ApiOperation({ summary: 'Get all proposals' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all proposals',
    type: [Proposal]
  })
  async findAll(): Promise<Proposal[]> {
    try {
      return await this.proposalService.findAll();
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve proposals');
    }
  }

  /**
   * @method findOne
   * @description Retrieves a specific proposal by its ID
   * 
   * This method fetches a single proposal entity based on its unique identifier.
   * It returns detailed information about the proposal, including its current status,
   * but does not include the associated votes (see findOneWithVotes for that).
   * 
   * @param {string} proposalId - Unique identifier of the proposal
   * @returns {Promise<Proposal>} The requested proposal entity
   * 
   * @throws {NotFoundException} If the proposal does not exist
   * @throws {InternalServerErrorException} If there's an unexpected error during retrieval
   */
  @Get(':proposalId')
  @ApiOperation({ summary: 'Get a proposal by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'The proposal entity',
    type: Proposal
  })
  @ApiResponse({ status: 404, description: 'Proposal not found.' })
  async findOne(@Param('proposalId') proposalId: string): Promise<Proposal> {
    try {
      return await this.proposalService.findOne(proposalId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve proposal');
    }
  }

  /**
   * @method findOneWithVotes
   * @description Retrieves a proposal with its votes populated
   * 
   * This method fetches a single proposal including all votes cast on it.
   * This enables a comprehensive view of the proposal's current voting status.
   * 
   * @param {string} proposalId - Unique identifier of the proposal
   * @returns {Promise<Proposal>} The requested proposal with votes populated
   * 
   * @throws {NotFoundException} If the proposal does not exist
   * @throws {InternalServerErrorException} If there's an unexpected error during retrieval
   */
  @Get(':proposalId/with-votes')
  @ApiOperation({ summary: 'Get a proposal with its votes' })
  @ApiResponse({ 
    status: 200, 
    description: 'The proposal with votes populated',
    type: Proposal
  })
  @ApiResponse({ status: 404, description: 'Proposal not found.' })
  async findOneWithVotes(@Param('proposalId') proposalId: string): Promise<Proposal> {
    try {
      return await this.proposalService.findOneWithVotes(proposalId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve proposal with votes');
    }
  }

  /**
   * @method findByDao
   * @description Retrieves all proposals for a specific DAO
   * 
   * This method fetches all proposal entities associated with a particular DAO.
   * It can be used to show a DAO's governance history and current active proposals.
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @returns {Promise<Proposal[]>} Array of proposals for the specified DAO
   * 
   * @throws {NotFoundException} If the DAO does not exist
   * @throws {InternalServerErrorException} If there's an unexpected error during retrieval
   */
  @Get('dao/:daoId')
  @ApiOperation({ summary: 'Get all proposals for a DAO' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of proposals for the specified DAO',
    type: [Proposal]
  })
  @ApiResponse({ status: 404, description: 'DAO not found.' })
  async findByDao(@Param('daoId') daoId: string): Promise<Proposal[]> {
    try {
      return await this.proposalService.findByDao(daoId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve proposals');
    }
  }

  /**
   * @method findActiveByDao
   * @description Retrieves all active proposals for a specific DAO
   * 
   * This method fetches all currently active proposals for a DAO, which are
   * those that members can currently vote on. This is useful for showing
   * only the relevant actionable items to DAO members.
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @returns {Promise<Proposal[]>} Array of active proposals for the specified DAO
   * 
   * @throws {NotFoundException} If the DAO does not exist
   * @throws {InternalServerErrorException} If there's an unexpected error during retrieval
   */
  @Get('dao/:daoId/active')
  @ApiOperation({ summary: 'Get active proposals for a DAO' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of active proposals for the specified DAO',
    type: [Proposal]
  })
  @ApiResponse({ status: 404, description: 'DAO not found.' })
  async findActiveByDao(@Param('daoId') daoId: string): Promise<Proposal[]> {
    try {
      return await this.proposalService.findActiveByDao(daoId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve active proposals');
    }
  }
} 