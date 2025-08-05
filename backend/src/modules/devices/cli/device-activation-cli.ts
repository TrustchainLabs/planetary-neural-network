/**
 * @module device-activation-cli
 * @description Command-line interface for device activation
 * 
 * This module provides a CLI for activating IoT devices on Raspberry Pi.
 * It allows device operators to start their devices by providing:
 * - Device database ID
 * - Device private key for blockchain operations
 * 
 * The CLI provides an interactive menu system for device management.
 */

import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Device } from '../entities/device.entity';
import { Model } from 'mongoose';
import { SmartConfigService } from '@hsuite/smart-config';
import { SmartLedgersService } from '@hsuite/smart-ledgers';
import { ChainType, ILedger } from '@hsuite/smart-ledgers';
import { Client, PrivateKey } from '@hashgraph/sdk';
import { bootstrap } from '../../../main-device';
// Import inquirer using require to avoid ES module issues
const inquirer = require('inquirer');

/**
 * @class CustomCliLogger
 * @description Custom logger for device activation CLI
 */
@Injectable()
export class DeviceActivationLogger implements LoggerService {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  log(message: any, context?: string): any {
    const currentContext = context || this.context;
    const formattedMessage = currentContext ? `[${currentContext}] ${message}` : message;
    console.log(`\x1b[32m🚀 ${formattedMessage}\x1b[0m`);
  }

  error(message: any, trace?: string, context?: string): any {
    const currentContext = context || this.context;
    const formattedMessage = currentContext ? `[${currentContext}] ${message}` : message;
    console.error(`\x1b[31m❌ ${formattedMessage}\x1b[0m`);
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: any, context?: string): any {
    const currentContext = context || this.context;
    const formattedMessage = currentContext ? `[${currentContext}] ${message}` : message;
    console.warn(`\x1b[33m⚠️ ${formattedMessage}\x1b[0m`);
  }

  debug(message: any, context?: string): any {
    const currentContext = context || this.context;
    const formattedMessage = currentContext ? `[${currentContext}] ${message}` : message;
    console.debug(`\x1b[34m🔍 ${formattedMessage}\x1b[0m`);
  }

  verbose(message: any, context?: string): any {
    const currentContext = context || this.context;
    const formattedMessage = currentContext ? `[${currentContext}] ${message}` : message;
    console.debug(`\x1b[36m📝 ${formattedMessage}\x1b[0m`);
  }
}

/**
 * @class DeviceActivationCommand
 * @description Command implementation for device activation
 * 
 * Provides interactive CLI for device activation with menu system.
 */
@Injectable()
@Command({ name: 'device', description: 'Activate and manage IoT device' })
export class DeviceActivationCommand extends CommandRunner implements OnModuleInit {
  private readonly logger: LoggerService;
  private ledger: ILedger;
  private client: Client;
  private chain: ChainType;

  constructor(
    @InjectModel(Device.name) private deviceModel: Model<Device>,
    private readonly smartConfigService: SmartConfigService,
    private readonly smartLedgersService: SmartLedgersService
  ) {
    super();
    this.logger = new DeviceActivationLogger(DeviceActivationCommand.name);
  }

  async onModuleInit() {
    this.chain = this.smartConfigService.getChain();
    this.ledger = this.smartLedgersService.getAdapter(this.chain).getLedger();
    this.client = await this.ledger.getClient();
  }

  /**
   * Interactive device selection menu
   */
  private async showDeviceMenu(): Promise<{ action: string; deviceId?: string; privateKey?: string }> {
    console.log('\n🌡️  Climate DAO Device Manager\n');
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🚀 Activate Device (Start Data Collection)', value: 'activate' },
          { name: '📋 List Registered Devices', value: 'list' },
          { name: '📊 Check Device Status', value: 'status' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);

    if (action === 'exit') {
      return { action };
    }

    if (action === 'activate') {
      const { deviceId } = await inquirer.prompt([
        {
          type: 'input',
          name: 'deviceId',
          message: '📱 Enter Device Database ID:',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Device ID is required';
            }
            return true;
          }
        }
      ]);

      const { privateKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'privateKey',
          message: '🔐 Enter Device Private Key:',
          mask: '*',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Private key is required';
            }
            try {
              // Validate private key format
              PrivateKey.fromStringED25519(input);
              return true;
            } catch (error) {
              return 'Invalid private key format';
            }
          }
        }
      ]);

      return { action, deviceId: deviceId.trim(), privateKey: privateKey.trim() };
    }

    return { action };
  }

  /**
   * List all registered devices
   */
  private async listDevices(): Promise<void> {
    try {
      const devices = await this.deviceModel.find().exec();
      
      if (devices.length === 0) {
        this.logger.warn('No devices found in database');
        return;
      }

      console.log('\n📱 Registered Devices:\n');
      devices.forEach((device, index) => {
        console.log(`${index + 1}. Device ID: ${device._id}`);
        console.log(`   Name: ${device.name || 'Unnamed Device'}`);
        console.log(`   Type: ${device.type}`);
        console.log(`   Account: ${device.accountId}`);
        console.log(`   Status: ${device.isActive ? '🟢 Active' : '🔴 Inactive'}`);
        console.log(`   Created: ${device.createdAt}\n`);
      });
    } catch (error) {
      this.logger.error('Failed to list devices', error);
    }
  }

  /**
   * Check device status
   */
  private async checkDeviceStatus(): Promise<void> {
    const { deviceId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'deviceId',
        message: '📱 Enter Device Database ID:',
        validate: (input: string) => input.trim() ? true : 'Device ID is required'
      }
    ]);

    try {
      const device = await this.deviceModel.findById(deviceId.trim()).exec();
      
      if (!device) {
        this.logger.error('Device not found');
        return;
      }

      console.log('\n📊 Device Status:\n');
      console.log(`Name: ${device.name || 'Unnamed Device'}`);
      console.log(`Type: ${device.type}`);
      console.log(`Account: ${device.accountId}`);
      console.log(`Status: ${device.isActive ? '🟢 Active' : '🔴 Inactive'}`);
      console.log(`Location: ${device.location?.coordinates || 'Not set'}`);
      console.log(`Created: ${device.createdAt}`);
      console.log(`Updated: ${device.updatedAt}\n`);
    } catch (error) {
      this.logger.error('Failed to get device status', error);
    }
  }

  /**
   * Activate device and start the device server
   */
  private async activateDevice(deviceId: string, privateKey: string): Promise<void> {
    try {
      // Verify device exists in database
      const device = await this.deviceModel.findById(deviceId).exec();
      
      if (!device) {
        this.logger.error('Device not found in database');
        return;
      }

      // Validate private key matches device account
      const derivedAccountId = PrivateKey.fromStringED25519(privateKey).publicKey.toAccountId(0, 0);
      
      if (derivedAccountId.toString() !== device.accountId) {
        this.logger.error('Private key does not match device account ID');
        return;
      }

      // Update device status to active
      device.isActive = true;
      device.lastSeen = new Date();
      await device.save();

      this.logger.log(`Device ${device.name || deviceId} activated successfully`);
      this.logger.log('Starting device server...');

      // Set environment variables for device operation
      process.env.DEVICE_ID = deviceId;
      process.env.DEVICE_PRIVATE_KEY = privateKey;
      process.env.DEVICE_ACCOUNT_ID = device.accountId;

      // Start the device server
      await bootstrap();
      
    } catch (error) {
      this.logger.error('Failed to activate device', error);
    }
  }

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    try {
      while (true) {
        const { action, deviceId, privateKey } = await this.showDeviceMenu();

        switch (action) {
          case 'activate':
            if (deviceId && privateKey) {
              await this.activateDevice(deviceId, privateKey);
              return; // Exit CLI after starting device server
            }
            break;

          case 'list':
            await this.listDevices();
            break;

          case 'status':
            await this.checkDeviceStatus();
            break;

          case 'exit':
            this.logger.log('Goodbye! 👋');
            return;

          default:
            this.logger.warn('Unknown action');
            break;
        }

        // Ask if user wants to continue
        const { continue: shouldContinue } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continue',
            message: 'Continue with device management?',
            default: true
          }
        ]);

        if (!shouldContinue) {
          this.logger.log('Goodbye! 👋');
          break;
        }
      }
    } catch (error) {
      this.logger.error('Device activation failed', error);
    }
  }
}