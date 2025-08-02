/**
 * @module DaoController
 * @description Controller handling DAO management API endpoints
 * 
 * This module provides the REST API endpoints for creating and managing
 * Decentralized Autonomous Organizations (DAOs). It exposes operations for
 * creating DAOs, retrieving DAO information, managing membership, and
 * querying DAOs by various criteria.
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
import { DaoService } from './dao.service';
import { CreateDaoDto } from './dto/create-dao.dto';
import { Dao } from './entities/dao.entity';
import { Error as MongooseError } from 'mongoose';

/**
 * @class DaoController
 * @description Controller for DAO-related API endpoints
 * 
 * The DaoController exposes REST API endpoints for managing Decentralized
 * Autonomous Organizations (DAOs). It provides operations for creating DAOs,
 * querying existing DAOs, managing membership, and retrieving detailed
 * information about DAOs including their associated proposals.
 * 
 * This controller delegates business logic to the DaoService and focuses on
 * handling HTTP requests and responses, input validation, and authentication.
 */
@ApiTags('daos')
@Controller('daos')
export class DaoController {
  /**
   * @constructor
   * @description Initializes the DAO controller with required services
   * 
   * @param {DaoService} daoService - Service handling DAO business logic
   */
  constructor(private readonly daoService: DaoService) {}

  /**
   * @method create
   * @description Creates a new Decentralized Autonomous Organization
   * 
   * This endpoint creates a new DAO based on the provided data.
   * It requires authentication, ensuring only authenticated users can create DAOs.
   * The method validates the input data according to the CreateDaoDto
   * schema and returns the newly created DAO.
   * 
   * @param {CreateDaoDto} createDaoDto - Data for the new DAO
   * @returns {Promise<Dao>} The created DAO entity
   * 
   * @throws {BadRequestException} If validation fails or a DAO with the same ID/name exists
   * @throws {InternalServerErrorException} If there's an unexpected error during creation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new DAO' })
  @ApiResponse({ 
    status: 201, 
    description: 'The DAO has been successfully created.',
    type: Dao
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  async create(@Body(new ValidationPipe()) createDaoDto: CreateDaoDto): Promise<Dao> {
    try {
      return await this.daoService.create(createDaoDto);
    } catch (error) {
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
      if (error.name === 'MongoServerError' && error.code === 11000) {
        throw new BadRequestException('A DAO with this ID or name already exists');
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create DAO');
    }
  }

  /**
   * @method findAll
   * @description Retrieves all DAOs in the system
   * 
   * This method fetches all DAO entities without any filtering.
   * In production environments with many DAOs, this method should be enhanced
   * with pagination, filtering, and sorting capabilities.
   * 
   * @returns {Promise<Dao[]>} Array of all DAOs in the system
   * 
   * @throws {InternalServerErrorException} If there's an unexpected error during retrieval
   */
  @Get()
  @ApiOperation({ summary: 'Get all DAOs' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all DAOs',
    type: [Dao]
  })
  async findAll(): Promise<Dao[]> {
    try {
      return await this.daoService.findAll();
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve DAOs');
    }
  }

  /**
   * @method findOne
   * @description Retrieves a specific DAO by its ID
   * 
   * This method fetches detailed information about a single DAO entity.
   * It returns the basic DAO information without populated relations.
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @returns {Promise<Dao>} The requested DAO entity
   * 
   * @throws {NotFoundException} If the DAO does not exist
   * @throws {InternalServerErrorException} If there's an unexpected error during retrieval
   */
  @Get(':daoId')
  @ApiOperation({ summary: 'Get a DAO by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'The DAO entity',
    type: Dao
  })
  @ApiResponse({ status: 404, description: 'DAO not found.' })
  async findOne(@Param('daoId') daoId: string): Promise<Dao> {
    try {
      return await this.daoService.findOne(daoId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve DAO');
    }
  }

  /**
   * @method findOneWithProposals
   * @description Retrieves a DAO with its proposals populated
   * 
   * This method fetches a DAO entity with its associated proposals populated.
   * This provides a comprehensive view of the DAO and its governance activities.
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @returns {Promise<Dao>} The DAO with proposals populated
   * 
   * @throws {NotFoundException} If the DAO does not exist
   * @throws {InternalServerErrorException} If there's an unexpected error during retrieval
   */
  @Get(':daoId/with-proposals')
  @ApiOperation({ summary: 'Get a DAO with its proposals' })
  @ApiResponse({ 
    status: 200, 
    description: 'The DAO with proposals populated',
    type: Dao
  })
  @ApiResponse({ status: 404, description: 'DAO not found.' })
  async findOneWithProposals(@Param('daoId') daoId: string): Promise<Dao> {
    try {
      return await this.daoService.findOneWithProposals(daoId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve DAO with proposals');
    }
  }

  /**
   * @method findByOwner
   * @description Retrieves all DAOs owned by a specific address
   * 
   * This method fetches all DAO entities associated with a particular owner address.
   * It's useful for displaying a user's DAOs in a dashboard or profile view.
   * 
   * @param {string} ownerAddress - Blockchain address of the DAO owner
   * @returns {Promise<Dao[]>} Array of DAOs owned by the specified address
   * 
   * @throws {InternalServerErrorException} If there's an unexpected error during retrieval
   */
  @Get('owner/:ownerAddress')
  @ApiOperation({ summary: 'Get all DAOs by owner address' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of DAOs for the specified owner',
    type: [Dao]
  })
  async findByOwner(@Param('ownerAddress') ownerAddress: string): Promise<Dao[]> {
    try {
      return await this.daoService.findByOwner(ownerAddress);
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve DAOs');
    }
  }

  /**
   * @method addMember
   * @description Adds a new member to a DAO
   * 
   * This method adds a specified blockchain address as a member to a DAO.
   * It requires authentication and checks that the requester has appropriate
   * permissions to add members to the DAO (typically the owner or an admin).
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @param {string} memberAddress - Blockchain address to add as a member
   * @returns {Promise<Dao>} The updated DAO entity with the new member added
   * 
   * @throws {NotFoundException} If the DAO does not exist
   * @throws {BadRequestException} If the address is invalid or already a member
   * @throws {InternalServerErrorException} If there's an unexpected error during the operation
   */
  @Post(':daoId/members/:memberAddress')
  @ApiOperation({ summary: 'Add a member to a DAO' })
  @ApiResponse({ 
    status: 200, 
    description: 'Member successfully added to the DAO',
    type: Dao
  })
  @ApiResponse({ status: 400, description: 'Invalid input or member already exists.' })
  @ApiResponse({ status: 404, description: 'DAO not found.' })
  async addMember(
    @Param('daoId') daoId: string,
    @Param('memberAddress') memberAddress: string
  ): Promise<Dao> {
    try {
      return await this.daoService.addMember(daoId, memberAddress);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to add member to DAO');
    }
  }
} 