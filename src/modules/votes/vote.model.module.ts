/**
 * @module VoteModelModule
 * @description Module for managing vote data models and database interactions
 * 
 * This module provides the infrastructure for working with Vote entities in the database.
 * It configures Mongoose integration, registers schemas, and provides services for
 * data access operations on Vote records.
 * 
 * The module encapsulates all data access concerns related to Votes, allowing
 * the rest of the application to work with Vote entities through the VoteModelService.
 * It also imports the DaoModelModule and ProposalModelModule to access related data
 * for vote operations and maintain referential integrity between entities.
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Vote, VoteSchema } from './entities/vote.entity';
import { VoteModelService } from './vote.model.service';
import { DaoModelModule } from '../daos/dao.model.module';
import { ProposalModelModule } from '../proposals/proposal.model.module';

/**
 * @class VoteModelModule
 * @description Module providing data model and database infrastructure for Votes
 * 
 * The VoteModelModule integrates the Vote schema with Mongoose and provides
 * services for performing database operations on Vote entities. It registers
 * the Vote schema with MongoDB and makes the VoteModelService available to
 * other modules that need to interact with Vote data.
 * 
 * This module is designed to be imported by the VoteModule to provide
 * data persistence capabilities, while maintaining separation of concerns between
 * data access and business logic. It imports both the DAO and Proposal model modules
 * to establish relationships between votes and the entities they reference.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Vote.name, 
      schema: VoteSchema 
    }]),
    DaoModelModule,
    ProposalModelModule
  ],
  controllers: [],
  providers: [
    VoteModelService
  ],
  exports: [
    VoteModelService
  ]
})
export class VoteModelModule {} 