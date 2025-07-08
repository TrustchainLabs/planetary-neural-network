/**
 * @module ProposalModelModule
 * @description Module for managing proposal data models and database interactions
 * 
 * This module provides the infrastructure for working with Proposal entities in the database.
 * It configures Mongoose integration, registers schemas, and provides services for
 * data access operations on Proposal records.
 * 
 * The module encapsulates all data access concerns related to Proposals, allowing
 * the rest of the application to work with Proposal entities through the ProposalModelService.
 * It also imports the DaoModelModule to access DAO-related data for proposal operations.
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Proposal, ProposalSchema } from './entities/proposal.entity';
import { ProposalModelService } from './proposal.model.service';
import { DaoModelModule } from '../daos/dao.model.module';

/**
 * @class ProposalModelModule
 * @description Module providing data model and database infrastructure for Proposals
 * 
 * The ProposalModelModule integrates the Proposal schema with Mongoose and provides
 * services for performing database operations on Proposal entities. It registers
 * the Proposal schema with MongoDB and makes the ProposalModelService available to
 * other modules that need to interact with Proposal data.
 * 
 * This module is designed to be imported by the ProposalModule to provide
 * data persistence capabilities, while maintaining separation of concerns between
 * data access and business logic.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Proposal.name, 
      schema: ProposalSchema 
    }]),
    DaoModelModule
  ],
  controllers: [],
  providers: [
    ProposalModelService
  ],
  exports: [
    ProposalModelService
  ]
})
export class ProposalModelModule {} 