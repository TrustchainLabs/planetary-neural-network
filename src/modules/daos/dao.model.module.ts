/**
 * @module DaoModelModule
 * @description Module for managing DAO data models and database interactions
 * 
 * This module provides the infrastructure for working with DAO entities in the database.
 * It configures Mongoose integration, registers schemas, and provides services for
 * data access operations on DAO records.
 * 
 * The module encapsulates all data access concerns related to DAOs, allowing
 * the rest of the application to work with DAO entities through the DaoModelService.
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Dao, DaoSchema } from './entities/dao.entity';
import { DaoModelService } from './dao.model.service';

/**
 * @class DaoModelModule
 * @description Module providing data model and database infrastructure for DAOs
 * 
 * The DaoModelModule integrates the DAO schema with Mongoose and provides
 * services for performing database operations on DAO entities. It registers
 * the DAO schema with MongoDB and makes the DaoModelService available to
 * other modules that need to interact with DAO data.
 * 
 * This module is designed to be imported by the DaoModule to provide
 * data persistence capabilities.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Dao.name, 
      schema: DaoSchema 
    }])
  ],
  controllers: [],
  providers: [
    DaoModelService
  ],
  exports: [
    DaoModelService
  ]
})
export class DaoModelModule {} 