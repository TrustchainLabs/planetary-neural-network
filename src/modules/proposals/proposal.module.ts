/**
 * @module ProposalModule
 * @description Proposal management module for the application
 * 
 * This module provides functionality for creating, managing, and interacting with
 * proposals within Decentralized Autonomous Organizations (DAOs). It integrates 
 * controllers, services, models, and event handlers needed for comprehensive 
 * proposal management.
 * 
 * The module is responsible for:
 * - Creating and managing proposals
 * - Processing background jobs for proposal operations
 * - Handling proposal-related events
 * - Exposing proposal management endpoints through a REST API
 * - Managing the lifecycle of proposals, including expiration and status updates
 */
import { Module } from '@nestjs/common';
import { ProposalController } from './proposal.controller';
import { ProposalService } from './proposal.service';
import { ProposalModelModule } from './proposal.model.module';
import { BullModule } from '@nestjs/bull';
import { ProposalConsumer } from './proposal.consumer';
import { ProposalEvents } from './proposal.events';

/**
 * @class ProposalModule
 * @description Module for proposal management functionality
 * 
 * The ProposalModule integrates all components needed for proposal management:
 * - ProposalController: Exposes REST API endpoints for proposal operations
 * - ProposalService: Implements business logic for proposal management
 * - ProposalModelModule: Provides data models and repositories for proposals
 * - BullModule: Manages background processing queue for proposal operations
 * - ProposalConsumer: Processes background jobs for proposals
 * - ProposalEvents: Handles event-driven operations for proposals
 * 
 * This module exports the ProposalService to make it available to other modules
 * that need to interact with proposals, such as the VoteModule.
 */
@Module({
  imports: [
    ProposalModelModule,
    BullModule.registerQueue({
      name: 'dao',
    })
  ],
  controllers: [ProposalController],
  providers: [ProposalService, ProposalConsumer, ProposalEvents],
  exports: [ProposalService]
})
export class ProposalModule {} 