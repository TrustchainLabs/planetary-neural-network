/**
 * @module configs-cli
 * @description Command-line interface for database configurations
 * 
 * This module provides a comprehensive command-line interface (CLI) for managing database configurations,
 * allowing administrators to create, update, and manage database configs through an intuitive command-line interface.
 * It's implemented using the nest-commander pattern to seamlessly integrate CLI commands within the NestJS framework.
 * 
 * The module handles blockchain-specific operations through a chain-agnostic approach, with specialized
 * implementations for different blockchain networks like Hedera Hashgraph and Ripple.
 */

import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
import { SmartNodeSdkService } from '@hsuite/smartnode-sdk';
import { InjectModel } from '@nestjs/mongoose';
import { Config, ConfigDocument } from '../entities/config.entity';
import { Model } from 'mongoose';
import { Client, PrivateKey, TokenCreateTransaction, TokenType, Transaction } from '@hashgraph/sdk';
import { SmartConfigService } from '@hsuite/smart-config';
import { IHashgraph } from '@hsuite/hashgraph-types';
import { ChainType, ILedger, SmartLedgersService } from '@hsuite/smart-ledgers';
// Import inquirer using require to avoid ES module issues
const inquirer = require('inquirer');

/**
 * @class CustomCliLogger
 * @description Custom logger implementation for CLI commands
 * 
 * This logger extends the NestJS LoggerService interface and ensures proper functionality
 * in command-line contexts. It provides direct console output with color-coded log levels
 * while maintaining the structured logging capabilities expected from a NestJS Logger.
 * 
 * The logger supports multiple log levels (log, error, warn, debug, verbose) and
 * contextual logging to help identify the source of log messages.
 */
@Injectable()
export class CustomCliLogger implements LoggerService {
  /**
   * Optional context name for the logger
   * @private
   */
  private context?: string;

  /**
   * Creates a new logger instance with optional context
   * 
   * @param context - Optional context name for the logger that will be prefixed to all log messages
   */
  constructor(context?: string) {
    this.context = context;
  }

  /**
   * Logs a message at the 'log' level with green color coding
   * 
   * @param message - The message to log, can be any serializable object
   * @param context - Optional context override for this specific log message
   * @returns {any} The result of the console.log operation
   */
  log(message: any, context?: string): any {
    const currentContext = context || this.context;
    const formattedMessage = currentContext ? `[${currentContext}] ${message}` : message;
    console.log(`\x1b[32mLOG\x1b[0m ${formattedMessage}`);
  }

  /**
   * Logs a message at the 'error' level with red color coding
   * 
   * @param message - The error message to log
   * @param trace - Optional stack trace for error debugging
   * @param context - Optional context override for this specific error message
   * @returns {any} The result of the console.error operation
   */
  error(message: any, trace?: string, context?: string): any {
    const currentContext = context || this.context;
    const formattedMessage = currentContext ? `[${currentContext}] ${message}` : message;
    console.error(`\x1b[31mERROR\x1b[0m ${formattedMessage}`);
    if (trace) {
      console.error(trace);
    }
  }

  /**
   * Logs a message at the 'warn' level with yellow color coding
   * 
   * @param message - The warning message to log
   * @param context - Optional context override for this specific warning message
   * @returns {any} The result of the console.warn operation
   */
  warn(message: any, context?: string): any {
    const currentContext = context || this.context;
    const formattedMessage = currentContext ? `[${currentContext}] ${message}` : message;
    console.warn(`\x1b[33mWARN\x1b[0m ${formattedMessage}`);
  }

  /**
   * Logs a message at the 'debug' level with blue color coding
   * 
   * @param message - The debug message to log
   * @param context - Optional context override for this specific debug message
   * @returns {any} The result of the console.debug operation
   */
  debug(message: any, context?: string): any {
    const currentContext = context || this.context;
    const formattedMessage = currentContext ? `[${currentContext}] ${message}` : message;
    console.debug(`\x1b[34mDEBUG\x1b[0m ${formattedMessage}`);
  }

  /**
   * Logs a message at the 'verbose' level with cyan color coding
   * 
   * @param message - The verbose message to log
   * @param context - Optional context override for this specific verbose message
   * @returns {any} The result of the console.debug operation
   */
  verbose(message: any, context?: string): any {
    const currentContext = context || this.context;
    const formattedMessage = currentContext ? `[${currentContext}] ${message}` : message;
    console.debug(`\x1b[36mVERBOSE\x1b[0m ${formattedMessage}`);
  }
}

/**
 * @class ConfigCommand
 * @description Command implementation for database configurations
 * 
 * Provides comprehensive command-line functionality for managing database configurations.
 * This class handles the creation, validation, and management of configuration entries
 * in the database, with support for multiple blockchain networks through a chain-agnostic approach.
 * 
 * Key features:
 * - Blockchain-specific topic creation for configuration storage
 * - Interactive confirmation prompts for destructive operations
 * - Force flag support for automated/scripted usage
 * - Comprehensive error handling and logging
 * 
 * @implements {CommandRunner}
 * @implements {OnModuleInit}
 */
@Injectable()
@Command({ name: 'config', description: 'Run database configs' })
export class ConfigCommand extends CommandRunner implements OnModuleInit {
  /**
   * Internal logger for command operations with contextual information
   * @private
   * @readonly
   */
  private readonly logger: LoggerService;

  /**
   * Operator credentials for blockchain operations
   * Contains the account ID and private key needed for signing transactions
   * @private
   */
  private operator: IHashgraph.IOperator;

  /**
   * Blockchain client instance for network operations
   * Used to submit transactions and query the network
   * @private
   */
  private client: Client;

  /**
   * Ledger interface for blockchain-agnostic operations
   * Provides standardized methods for interacting with different blockchains
   * @private
   */
  private ledger: ILedger;

  /**
   * The current blockchain network type (e.g., HASHGRAPH, RIPPLE)
   * Determines which chain-specific implementations to use
   * @private
   */
  private chain: ChainType;

  /**
   * Creates an instance of ConfigCommand with all required dependencies
   * 
   * @param configModel - Mongoose model for database configuration documents
   * @param smartNodeSdkService - Service for interacting with the Smart Node SDK
   * @param smartConfigService - Service for accessing application configuration
   * @param smartLedgersService - Service for blockchain ledger operations
   */
  constructor(
    @InjectModel(Config.name) private configModel: Model<ConfigDocument>,
    private readonly smartNodeSdkService: SmartNodeSdkService,
    private readonly smartConfigService: SmartConfigService,
    private readonly smartLedgersService: SmartLedgersService
  ) {
    super();
    this.logger = new CustomCliLogger(ConfigCommand.name);
    this.operator = this.smartConfigService.getOperator();
  }

  /**
   * Lifecycle hook that initializes the service when the module is loaded
   * 
   * @description
   * This method is automatically called by NestJS once the module has been initialized.
   * It performs the following initialization tasks:
   * 1. Retrieves the configured blockchain network type from application configuration
   * 2. Initializes the appropriate ledger adapter for the configured blockchain
   * 3. Establishes a client connection to the blockchain network
   * 
   * This initialization ensures that the command is ready to perform blockchain
   * operations when executed.
   * 
   * @returns {Promise<void>} A promise that resolves when initialization is complete
   * 
   * @example
   * ```typescript
   * // This method is called automatically by NestJS
   * // No manual invocation is needed
   * ```
   */
  async onModuleInit() {
    this.chain = this.smartConfigService.getChain();
    this.ledger = this.smartLedgersService.getAdapter(this.chain).getLedger();
    this.client = await this.ledger.getClient();
  }

  /**
   * Defines a force option for the command to bypass confirmation prompts
   * 
   * @param val - The value passed to the force option (string or boolean)
   * @returns {boolean} True if force option is enabled, false otherwise
   */
  @Option({
    flags: '-f, --force [force]',
    description: 'Force creation of a new config even if one already exists',
    defaultValue: false,
  })
  parseForce(val: string | boolean): boolean {
    return val === 'true' || val === true;
  }

  /**
   * Prompts the user to confirm replacement of an existing configuration
   * 
   * @description
   * Displays an interactive confirmation prompt asking the user whether they
   * want to replace an existing configuration. This provides a safety mechanism
   * to prevent accidental deletion of configuration data.
   * 
   * @returns {Promise<boolean>} A promise resolving to true if confirmed, false otherwise
   */
  private async promptForConfirmation(): Promise<boolean> {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'A configuration already exists. Do you want to replace it?',
        default: false,
      },
    ]);
    return answers.confirm;
  }

  /**
   * Creates a new configuration document in the database
   * 
   * @description
   * Initializes a new configuration document with default settings and the specified
   * collection and reward token IDs. The configuration includes settings for API rate limiting, 
   * administrator addresses, maintenance mode, and custom metadata.
   * 
   * @param {string} collectionTokenId - The NFT collection token ID for geo medallions
   * @param {string} rewardTokenId - The fungible token ID for device rewards
   * @returns {Promise<ConfigDocument>} The newly created configuration document
   */
  private async createConfig(collectionTokenId: string, deviceCollectionTokenId: string, rewardTokenId: string): Promise<ConfigDocument> {
    return this.configModel.create({
      geo_medallions_config: {
        collection_id: collectionTokenId,
        nft_metadata_cid: 'ipfs://bafybeigp4ojxfhnvph6mx3kojxnsf7lbzupkum2qqiq4n5t3pht362rdsm/medallion_cid.json',
      },
      smart_devices_config: {
        collection_id: deviceCollectionTokenId,
        nft_metadata_cid: 'ipfs://bafybeiaysrm3tw7ukgxphbpm6uwixtipam4ypmcn36e5gjjnzzwc6xzg3m/smartdevice_cid.json',
      },
      reward_token_config: {
        token_id: rewardTokenId,
        reward_per_submission: '10', // 10 tokens per data submission
        max_daily_rewards: '1000', // 1000 tokens max per device per day
      },
      apiRateLimit: 100,
      adminAddresses: [],
      maintenanceMode: false,
      customMetadata: {},
    });
  }

  /**
   * Executes the config command when invoked from the command line
   * 
   * @description
   * This is the main entry point for the command execution. It handles the entire
   * workflow of creating a new configuration:
   * 1. Checks for existing configurations
   * 2. Handles confirmation or force deletion if needed
   * 3. Creates a consensus validator
   * 4. Creates a blockchain topic based on the current chain type
   * 5. Creates and stores the configuration in the database
   * 
   * The method includes comprehensive error handling and logging throughout
   * the process.
   * 
   * @param {string[]} passedParams - Command line arguments (not used in this implementation)
   * @param {Record<string, any>} options - Command options including force flag
   * @returns {Promise<void>} A promise that resolves when the command execution is complete
   */
  async run(
    passedParams: string[],
    options?: Record<string, any>
  ): Promise<void> {
    try {
      this.logger.log('Config command executed');

      // Check if a config already exists
      const existingConfig = await this.configModel.findOne().exec();

      if (existingConfig) {
        this.logger.warn('A configuration already exists in the database');

        // Check if force flag is provided
        const forceCreate = options?.force || false;

        if (!forceCreate) {
          // Prompt user for confirmation
          const confirmed = await this.promptForConfirmation();

          if (!confirmed) {
            this.logger.log('Operation cancelled. Run with --force flag to override without confirmation.');
            return;
          }

          // User confirmed, delete existing config
          await this.configModel.deleteOne({ _id: existingConfig._id });
          this.logger.log('Existing configuration deleted');
        } else {
          // Force flag provided, delete existing config
          await this.configModel.deleteOne({ _id: existingConfig._id });
          this.logger.log('Existing configuration forcefully deleted');
        }
      }

      // Create a new config
      this.logger.log('Creating new configuration...');

      let collectionTokenId = null;
      let deviceCollectionTokenId = null;
      let rewardTokenId = null;
      
      switch(this.chain) {
        case ChainType.HASHGRAPH:
          this.logger.log('Creating NFT collection for geo medallions...');
          collectionTokenId = await this.hederaCreateGeoMedallionCollection();
          this.logger.log(`NFT collection created: ${collectionTokenId}`);

          this.logger.log('Creating NFT collection for smart devices...');
          deviceCollectionTokenId = await this.hederaCreateDeviceCollection();
          this.logger.log(`NFT collection created: ${deviceCollectionTokenId}`);
          
          this.logger.log('Creating fungible reward token for device data submissions...');
          rewardTokenId = await this.hederaCreateRewardToken();
          this.logger.log(`Reward token created: ${rewardTokenId}`);
          break;
        case ChainType.RIPPLE:
          throw new Error('Ripple is not supported yet');
          break;
        default:
          throw new Error(`Unsupported chain type: ${this.chain}`);
      }

      const config = await this.createConfig(collectionTokenId, deviceCollectionTokenId, rewardTokenId);

      this.logger.log(`New configuration created successfully with ID: ${config._id}`);
      this.logger.log(`NFT Collection Token ID: ${collectionTokenId}`);
      this.logger.log(`Reward Token ID: ${rewardTokenId}`);
    } catch (error) {
      this.logger.error('Failed to create configuration', error);
    }
  }

  private async hederaCreateGeoMedallionCollection() {
    try {
      const transactionToExecute = new TokenCreateTransaction()
        .setTokenName('Ecosphere - GeoMedallions')
        .setTokenSymbol('EGM')
        .setTokenType(TokenType.NonFungibleUnique)
        .setTreasuryAccountId(this.operator.accountId.toString())
        .setAdminKey(PrivateKey.fromStringED25519(this.operator.privateKey))
        .setFreezeKey(PrivateKey.fromStringED25519(this.operator.privateKey))
        .setWipeKey(PrivateKey.fromStringED25519(this.operator.privateKey))
        .setSupplyKey(PrivateKey.fromStringED25519(this.operator.privateKey))
        .freezeWith(this.client);

      let transaction = Transaction.fromBytes(new Uint8Array(Buffer.from(transactionToExecute.toBytes())));
      const signTx = await transaction.sign(PrivateKey.fromStringED25519(this.operator.privateKey));

      const submitTx = await signTx.execute(this.client);
      const receipt = await submitTx.getReceipt(this.client);

      return receipt.tokenId.toString();
    } catch(error) {
      throw new Error(`Failed to create token collection: ${error}`);
    }
  }

  private async hederaCreateDeviceCollection() {
    try {
      const transactionToExecute = new TokenCreateTransaction()
        .setTokenName('Ecosphere - Smart Devices')
        .setTokenSymbol('ESD')
        .setTokenType(TokenType.NonFungibleUnique)
        .setTreasuryAccountId(this.operator.accountId.toString())
        .setAdminKey(PrivateKey.fromStringED25519(this.operator.privateKey))
        .setFreezeKey(PrivateKey.fromStringED25519(this.operator.privateKey))
        .setWipeKey(PrivateKey.fromStringED25519(this.operator.privateKey))
        .setSupplyKey(PrivateKey.fromStringED25519(this.operator.privateKey))
        .freezeWith(this.client);

      let transaction = Transaction.fromBytes(new Uint8Array(Buffer.from(transactionToExecute.toBytes())));
      const signTx = await transaction.sign(PrivateKey.fromStringED25519(this.operator.privateKey));

      const submitTx = await signTx.execute(this.client);
      const receipt = await submitTx.getReceipt(this.client);

      return receipt.tokenId.toString();
    } catch(error) {
      throw new Error(`Failed to create token collection: ${error}`);
    }
  }

  private async hederaCreateRewardToken() {
    try {
      const transactionToExecute = new TokenCreateTransaction()
        .setTokenName('Climate Reward Token')
        .setTokenSymbol('CRT')
        .setTokenType(TokenType.FungibleCommon)
        .setInitialSupply(1000000000) // 1 billion tokens
        .setDecimals(2) // 2 decimal places
        .setTreasuryAccountId(this.operator.accountId.toString())
        .setAdminKey(PrivateKey.fromStringED25519(this.operator.privateKey))
        .setFreezeKey(PrivateKey.fromStringED25519(this.operator.privateKey))
        .setWipeKey(PrivateKey.fromStringED25519(this.operator.privateKey))
        .setSupplyKey(PrivateKey.fromStringED25519(this.operator.privateKey))
        .freezeWith(this.client);

      let transaction = Transaction.fromBytes(new Uint8Array(Buffer.from(transactionToExecute.toBytes())));
      const signTx = await transaction.sign(PrivateKey.fromStringED25519(this.operator.privateKey));

      const submitTx = await signTx.execute(this.client);
      const receipt = await submitTx.getReceipt(this.client);

      return receipt.tokenId.toString();
    } catch(error) {
      throw new Error(`Failed to create reward token: ${error}`);
    }
  }
}