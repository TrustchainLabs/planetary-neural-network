/**
 * @module DaoModelService
 * @description Service for DAO data persistence and retrieval
 * 
 * This module provides a service for managing the persistence and retrieval
 * of Decentralized Autonomous Organization (DAO) data in the database. It
 * implements data access operations using Mongoose models and provides a
 * clean abstraction for interacting with the DAO collection.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Dao, DaoDocument, DaoStatus } from './entities/dao.entity';
import { CreateDaoDto } from './dto/create-dao.dto';
import { randomUUID } from 'crypto';

/**
 * @class DaoModelService
 * @description Service for DAO data operations
 * 
 * The DaoModelService provides methods for creating, retrieving, updating,
 * and managing DAO entities in the database. It handles the direct interaction
 * with MongoDB through Mongoose models and provides a clean API for the business
 * logic layer to perform data operations.
 * 
 * This service encapsulates all database access logic for DAOs, ensuring
 * consistent data access patterns and error handling across the application.
 */
@Injectable()
export class DaoModelService {
  /**
   * @constructor
   * @description Creates a new instance of DaoModelService
   * 
   * @param {Model<DaoDocument>} daoModel - Mongoose model for the DAO collection
   */
  constructor(
    @InjectModel(Dao.name) private daoModel: Model<DaoDocument>
  ) {}

  /**
   * @method create
   * @description Creates a new DAO in the database
   * 
   * This method creates a new DAO entity in the database based on the 
   * provided data. It generates a unique daoId, sets the initial status
   * to ACTIVE, and initializes an empty proposals array.
   * 
   * @param {CreateDaoDto} createDaoDto - Data transfer object containing DAO creation parameters
   * @returns {Promise<Dao>} The newly created DAO entity
   */
  async create(createDaoDto: CreateDaoDto): Promise<Dao> {
    const daoId = `dao-${randomUUID()}`;
    
    const dao = new this.daoModel({
      ...createDaoDto,
      daoId,
      proposals: [],
      status: DaoStatus.ACTIVE
    });

    return dao.save();
  }

  /**
   * @method findAll
   * @description Retrieves all DAOs from the database
   * 
   * This method fetches all DAO entities from the database without
   * any filtering or pagination. It should be used with caution on
   * large datasets.
   * 
   * @returns {Promise<Dao[]>} Array of all DAO entities
   */
  async findAll(): Promise<Dao[]> {
    return this.daoModel.find().exec();
  }

  /**
   * @method findOne
   * @description Retrieves a specific DAO by its ID
   * 
   * This method fetches a DAO entity from the database by its unique
   * daoId. It returns the basic DAO information without populating any
   * relations.
   * 
   * @param {string} daoId - Unique identifier of the DAO to retrieve
   * @returns {Promise<Dao>} The requested DAO entity or null if not found
   */
  async findOne(daoId: string): Promise<Dao> {
    return this.daoModel.findOne({ daoId }).exec();
  }

  /**
   * @method findOneWithProposals
   * @description Retrieves a DAO with its associated proposals
   * 
   * This method fetches a DAO entity from the database by its unique
   * daoId and populates its proposals field with the associated proposal
   * entities. This provides a complete view of the DAO including all its
   * governance activities.
   * 
   * @param {string} daoId - Unique identifier of the DAO to retrieve
   * @returns {Promise<Dao>} The DAO with populated proposals or null if not found
   */
  async findOneWithProposals(daoId: string): Promise<Dao> {
    return this.daoModel.findOne({ daoId }).populate('proposals').exec();
  }

  /**
   * @method findByOwner
   * @description Retrieves all DAOs owned by a specific address
   * 
   * This method fetches all DAO entities from the database where the
   * specified address is the owner. This allows users to easily find
   * all DAOs under their control.
   * 
   * @param {string} ownerAddress - Blockchain address of the DAO owner
   * @returns {Promise<Dao[]>} Array of DAOs owned by the specified address
   */
  async findByOwner(ownerAddress: string): Promise<Dao[]> {
    return this.daoModel.find({ ownerAddress }).exec();
  }

  /**
   * @method update
   * @description Updates a DAO with new data
   * 
   * This method updates a DAO entity in the database with the provided
   * data. It uses findOneAndUpdate to atomically update the document and
   * return the updated version.
   * 
   * @param {string} daoId - Unique identifier of the DAO to update
   * @param {Partial<Dao>} updateData - Partial DAO object with fields to update
   * @returns {Promise<Dao>} The updated DAO entity
   * 
   * @throws {NotFoundException} If the DAO with the specified ID does not exist
   */
  async update(daoId: string, updateData: Partial<Dao>): Promise<Dao> {
    const dao = await this.daoModel.findOneAndUpdate(
      { daoId },
      updateData,
      { new: true }
    ).exec();
    
    if (!dao) {
      throw new NotFoundException(`DAO with ID ${daoId} not found`);
    }
    
    return dao;
  }

  /**
   * @method addMember
   * @description Adds a member to a DAO's members list
   * 
   * This method adds a specified address to the members array of a DAO.
   * It uses the $addToSet operator to ensure the address is not added
   * if it's already a member. It throws an exception if the DAO doesn't
   * exist or the member is already part of the DAO.
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @param {string} memberAddress - Blockchain address of the member to add
   * @returns {Promise<Dao>} The updated DAO with the new member
   * 
   * @throws {NotFoundException} If the DAO doesn't exist or member already exists
   */
  async addMember(daoId: string, memberAddress: string): Promise<Dao> {
    const dao = await this.daoModel.findOneAndUpdate(
      { daoId, members: { $ne: memberAddress } },
      { $addToSet: { members: memberAddress } },
      { new: true }
    ).exec();
    
    if (!dao) {
      throw new NotFoundException(`DAO with ID ${daoId} not found or member already exists`);
    }
    
    return dao;
  }

  /**
   * @method removeMember
   * @description Removes a member from a DAO's members list
   * 
   * This method removes a specified address from the members array of a DAO.
   * It uses the $pull operator to remove the address if it exists in the array.
   * It throws an exception if the DAO doesn't exist.
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @param {string} memberAddress - Blockchain address of the member to remove
   * @returns {Promise<Dao>} The updated DAO without the member
   * 
   * @throws {NotFoundException} If the DAO with the specified ID does not exist
   */
  async removeMember(daoId: string, memberAddress: string): Promise<Dao> {
    const dao = await this.daoModel.findOneAndUpdate(
      { daoId },
      { $pull: { members: memberAddress } },
      { new: true }
    ).exec();
    
    if (!dao) {
      throw new NotFoundException(`DAO with ID ${daoId} not found`);
    }
    
    return dao;
  }

  /**
   * @method isMember
   * @description Checks if an address is a member of a DAO
   * 
   * This method verifies whether a specified address is included in
   * the members array of a DAO. It's useful for access control and
   * permission validation before performing member-only operations.
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @param {string} address - Blockchain address to check for membership
   * @returns {Promise<boolean>} True if the address is a member, false otherwise
   * 
   * @throws {NotFoundException} If the DAO with the specified ID does not exist
   */
  async isMember(daoId: string, address: string): Promise<boolean> {
    const dao = await this.daoModel.findOne({ daoId }).exec();
    if (!dao) {
      throw new NotFoundException(`DAO with ID ${daoId} not found`);
    }
    
    return dao.members.includes(address);
  }

  /**
   * @method addProposal
   * @description Associates a proposal with a DAO
   * 
   * This method adds a proposal reference to a DAO's proposals array.
   * It uses the $addToSet operator to ensure the proposal is not added
   * multiple times. This maintains the one-to-many relationship between
   * DAOs and proposals.
   * 
   * @param {string} daoId - Unique identifier of the DAO
   * @param {string} proposalId - MongoDB ObjectId of the proposal to add
   * @returns {Promise<Dao>} The updated DAO with the proposal reference added
   * 
   * @throws {NotFoundException} If the DAO with the specified ID does not exist
   */
  async addProposal(daoId: string, proposalId: string): Promise<Dao> {
    const dao = await this.daoModel.findOneAndUpdate(
      { daoId },
      { $addToSet: { proposals: proposalId } },
      { new: true }
    ).exec();
    
    if (!dao) {
      throw new NotFoundException(`DAO with ID ${daoId} not found`);
    }
    
    return dao;
  }
} 