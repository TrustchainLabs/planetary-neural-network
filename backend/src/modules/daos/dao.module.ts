/**
 * @module DaoModule
 * @description DAO management module for the application
 * 
 * This module provides functionality for creating, managing, and interacting with
 * Decentralized Autonomous Organizations (DAOs). It integrates controllers, services,
 * models, and event handlers needed for comprehensive DAO management.
 * 
 * The module is responsible for:
 * - Creating and managing DAOs
 * - Processing background jobs for DAO operations
 * - Handling DAO-related events
 * - Exposing DAO management endpoints through a REST API
 */
import { Module } from '@nestjs/common';
import { DaoController } from './dao.controller';
import { DaoService } from './dao.service';
import { DaoModelModule } from './dao.model.module';
import { BullModule } from '@nestjs/bull';
import { DaoConsumer } from './dao.consumer';
import { DaoEvents } from './dao.events';

/**
 * @class DaoModule
 * @description Module for DAO management functionality
 * 
 * The DaoModule integrates all components needed for DAO management:
 * - DaoController: Exposes REST API endpoints for DAO operations
 * - DaoService: Implements business logic for DAO management
 * - DaoModelModule: Provides data models and repositories for DAOs
 * - BullModule: Manages background processing queue for DAO operations
 * - DaoConsumer: Processes background jobs for DAOs
 * - DaoEvents: Handles event-driven operations for DAOs
 * 
 * This module exports the DaoService to make it available to other modules
 * that need to interact with DAOs.
 */
@Module({
  imports: [
    DaoModelModule,
    BullModule.registerQueue({
      name: 'dao',
    })
  ],
  controllers: [DaoController],
  providers: [DaoService, DaoConsumer, DaoEvents],
  exports: [DaoService]
})
export class DaoModule {} 