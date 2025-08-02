/**
 * @module DaoService
 * @description Service handling DAO business logic
 * 
 * This module provides a service for implementing the business logic related to
 * Decentralized Autonomous Organizations (DAOs). It coordinates data operations
 * through the DaoModelService and schedules background tasks using Bull queues
 * for asynchronous processing of resource-intensive operations.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DaoModelService } from './dao.model.service';
import { Dao } from './entities/dao.entity';
import { CreateDaoDto } from './dto/create-dao.dto';

/**
 * @class DaoService
 * @description Service implementing business logic for DAO operations
 * 
 * The DaoService implements the business logic for creating and managing
 * Decentralized Autonomous Organizations (DAOs). It serves as an intermediary
 * between the controllers and the data layer, handling validation, orchestration,
 * and scheduling of background tasks.
 * 
 * This service delegates data operations to the DaoModelService and uses
 * Bull queues for asynchronous processing of resource-intensive tasks.
 */
@Injectable()
export class DaoService {
  /**
   * @constructor
   * @description Creates a new instance of DaoService
   * 
   * @param {DaoModelService} daoModelService - Service for DAO data operations
   * @param {Queue} daoQueue - Bull queue for asynchronous DAO processing
   */
  constructor(
    private readonly daoModelService: DaoModelService,
    @InjectQueue('dao') private readonly daoQueue: Queue
  ) {}

  /**
   * @method create
   * @description Creates a new Decentralized Autonomous Organization
   * 
   * This method creates a new DAO based on the provided data. It first
   * persists the DAO in the database using the model service, then
   * schedules a background job to handle additional processing tasks,
   * such as blockchain interactions or notification delivery.
   * 
   * @param {CreateDaoDto} createDaoDto - Data transfer object containing DAO details
   * @returns {Promise<Dao>} The newly created DAO entity
   * 
   * @throws {BadRequestException} If the provided data is invalid or a constraint is violated
   */
  async create(createDaoDto: CreateDaoDto): Promise<Dao> {
    // Create the DAO in the database
    const dao = await this.daoModelService.create(createDaoDto);
    
    // Add a job to the queue for background processing
    await this.daoQueue.add('process-dao-creation', {
      daoId: dao.daoId,
      ownerAddress: dao.ownerAddress
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });
    
    return dao;
  }

  /**
   * @method findAll
   * @description Retrieves all DAOs in the system
   * 
   * This method returns a list of all DAOs currently in the system.
   * It delegates to the model service to perform the database query.
   * 
   * @returns {Promise<Dao[]>} Array of all DAO entities
   */
  async findAll(): Promise<Dao[]> {
    return this.daoModelService.findAll();
  }

  /**
   * @method findOne
   * @description Retrieves a specific DAO by its ID
   * 
   * This method fetches a DAO by its unique identifier. It delegates
   * to the model service to perform the database query.
   * 
   * @param {string} daoId - Unique identifier of the DAO to retrieve
   * @returns {Promise<Dao>} The requested DAO entity
   * 
   * @throws {NotFoundException} If the DAO with the specified ID does not exist
   */
  async findOne(daoId: string): Promise<Dao> {
    const dao = await this.daoModelService.findOne(daoId);
    if (!dao) {
      throw new NotFoundException(`DAO with ID ${daoId} not found`);
    }
    return dao;
  }
  
  /**
   * @method findOneWithProposals
   * @description Retrieves a DAO with its associated proposals
   * 
   * This method fetches a DAO by its unique identifier and populates
   * its proposals field with the associated proposal entities. It delegates
   * to the model service to perform the database query.
   * 
   * @param {string} daoId - Unique identifier of the DAO to retrieve
   * @returns {Promise<Dao>} The requested DAO with populated proposals
   * 
   * @throws {NotFoundException} If the DAO with the specified ID does not exist
   */
  async findOneWithProposals(daoId: string): Promise<Dao> {
    const dao = await this.daoModelService.findOneWithProposals(daoId);
    if (!dao) {
      throw new NotFoundException(`DAO with ID ${daoId} not found`);
    }
    return dao;
  }

  /**
   * @method findByOwner
   * @description Retrieves all DAOs owned by a specific address
   * 
   * This method returns all DAOs where the specified address is listed as
   * the owner. It delegates to the model service to perform the database query.
   * 
   * @param {string} ownerAddress - Blockchain address of the DAO owner
   * @returns {Promise<Dao[]>} Array of DAOs owned by the specified address
   */
  async findByOwner(ownerAddress: string): Promise<Dao[]> {
    return this.daoModelService.findByOwner(ownerAddress);
  }

  /**
   * @method addMember
   * @description Adds a new member to an existing DAO
   * 
   * This method adds the specified address as a member of the DAO. It first
   * checks if the address is already a member, then updates the DAO in the database 
   * using the model service, and finally schedules a background job to handle 
   * additional processing tasks.
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @param {string} memberAddress - Blockchain address of the new member
   * @returns {Promise<Dao>} The updated DAO with the new member added
   * 
   * @throws {NotFoundException} If the DAO with the specified ID does not exist
   * @throws {BadRequestException} If the address is already a member or invalid
   */
  async addMember(daoId: string, memberAddress: string): Promise<Dao> {
    // Check if member already exists
    const isMember = await this.daoModelService.isMember(daoId, memberAddress);
    
    if (isMember) {
      // If already a member, just return the DAO
      return this.daoModelService.findOne(daoId);
    }
    
    // Add the member to the DAO
    const dao = await this.daoModelService.addMember(daoId, memberAddress);
    
    // Add a job to the queue for background processing
    await this.daoQueue.add('process-member-addition', {
      daoId,
      memberAddress
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });
    
    return dao;
  }

  /**
   * @method removeMember
   * @description Removes a member from an existing DAO
   * 
   * This method removes the specified address from the DAO's membership list.
   * It first checks if the address is a member, then updates the DAO in the database 
   * using the model service, and finally schedules a background job to handle 
   * additional processing tasks.
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @param {string} memberAddress - Blockchain address of the member to remove
   * @returns {Promise<Dao>} The updated DAO with the member removed
   * 
   * @throws {NotFoundException} If the DAO with the specified ID does not exist
   * @throws {BadRequestException} If the address is not a member
   */
  async removeMember(daoId: string, memberAddress: string): Promise<Dao> {
    // Check if the address is a member
    const isMember = await this.daoModelService.isMember(daoId, memberAddress);
    
    if (!isMember) {
      // If not a member, just return the DAO
      return this.daoModelService.findOne(daoId);
    }
    
    // Remove the member from the DAO
    const dao = await this.daoModelService.removeMember(daoId, memberAddress);
    
    // Add a job to the queue for background processing
    await this.daoQueue.add('process-member-removal', {
      daoId,
      memberAddress
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });
    
    return dao;
  }
} 