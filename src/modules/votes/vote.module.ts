/**
 * @module VoteModule
 * @description Vote management module for the application
 * 
 * This module provides functionality for creating, managing, and processing
 * votes on proposals within Decentralized Autonomous Organizations (DAOs).
 * It integrates controllers, services, models, and event handlers needed for
 * comprehensive vote management.
 * 
 * The module is responsible for:
 * - Creating and recording votes on proposals
 * - Processing background jobs for vote operations
 * - Handling vote-related events
 * - Exposing vote management endpoints through a REST API
 * - Tabulating votes and managing vote weights
 */
import { Module } from '@nestjs/common';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';
import { VoteModelModule } from './vote.model.module';
import { BullModule } from '@nestjs/bull';
import { VoteConsumer } from './vote.consumer';
import { VoteEvents } from './vote.events';
import { ProposalModelModule } from '../proposals/proposal.model.module';
import { DaoModelModule } from '../daos/dao.model.module';

/**
 * @class VoteModule
 * @description Module for vote management functionality
 * 
 * The VoteModule integrates all components needed for vote management:
 * - VoteController: Exposes REST API endpoints for vote operations
 * - VoteService: Implements business logic for vote management
 * - VoteModelModule: Provides data models and repositories for votes
 * - BullModule: Manages background processing queue for vote operations
 * - VoteConsumer: Processes background jobs for votes
 * - VoteEvents: Handles event-driven operations for votes
 * - DaoModelModule: Provides access to DAO data for vote validation
 * 
 * This module exports the VoteService to make it available to other modules
 * that need to interact with votes, such as the ProposalModule for vote tabulation.
 */
@Module({
  imports: [
    VoteModelModule,
    ProposalModelModule,
    DaoModelModule,
    BullModule.registerQueue({
      name: 'dao',
    })
  ],
  controllers: [VoteController],
  providers: [VoteService, VoteConsumer, VoteEvents],
  exports: [VoteService]
})
export class VoteModule {} 