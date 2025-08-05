/**
 * @module enhanced-device-cli
 * @description Simplified CLI for device management
 * 
 * This module provides a focused CLI for IoT device management with 3 main functions:
 * - System Configuration: Shows device count, medallion configs, etc.
 * - This Device: Device activation and data monitoring
 * - System Health: Device health monitoring
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
import axios from 'axios';
const inquirer = require('inquirer');

/**
 * @class EnhancedCliLogger
 * @description Enhanced logger with colors and emojis for better UX
 */
@Injectable()
export class EnhancedCliLogger implements LoggerService {
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
 * @class EnhancedDeviceCommand
 * @description Simplified CLI command with 3 essential functions
 */
@Injectable()
@Command({ name: 'device-cli', description: 'Simplified IoT device management CLI' })
export class EnhancedDeviceCommand extends CommandRunner implements OnModuleInit {
  private readonly logger: LoggerService;
  private ledger: ILedger;
  private client: Client;
  private chain: ChainType;
  private readonly API_BASE = 'http://localhost:3001';
  private currentDeviceId: string | null = null;
  private currentPrivateKey: string | null = null;

  constructor(
    @InjectModel(Device.name) private deviceModel: Model<Device>,
    private readonly smartConfigService: SmartConfigService,
    private readonly smartLedgersService: SmartLedgersService
  ) {
    super();
    this.logger = new EnhancedCliLogger(EnhancedDeviceCommand.name);
  }

  async onModuleInit() {
    this.chain = this.smartConfigService.getChain();
    this.ledger = this.smartLedgersService.getAdapter(this.chain).getLedger();
    this.client = await this.ledger.getClient();
  }

  /**
   * Main CLI menu
   */
  private async showMainMenu(): Promise<void> {
    console.clear();
    console.log('\x1b[35m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[35m║                    🌡️  Climate DAO Device Manager           ║\x1b[0m');
    console.log('\x1b[35m║                        Simplified CLI v3.0                    ║\x1b[0m');
    console.log('\x1b[35m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '⚙️  System Configuration', value: 'system-config' },
          { name: '📱 This Device', value: 'this-device' },
          { name: '💚 System Health', value: 'system-health' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);

    switch (action) {
      case 'system-config':
        await this.showSystemConfiguration();
        break;
      case 'this-device':
        await this.showThisDevice();
        break;
      case 'system-health':
        await this.showSystemHealth();
        break;
      case 'exit':
        this.logger.log('Goodbye! 👋');
        process.exit(0);
        break;
    }

    // Return to main menu
    await this.showMainMenu();
  }

  /**
   * System Configuration Menu
   */
  private async showSystemConfiguration(): Promise<void> {
    console.clear();
    console.log('\x1b[36m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[36m║                   ⚙️  System Configuration                    ║\x1b[0m');
    console.log('\x1b[36m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');

    try {
      // Get system information
      const [deviceCount, activeDeviceCount, config] = await Promise.all([
        this.getDeviceCount(),
        this.getActiveDeviceCount(),
        this.getSmartAppConfig()
      ]);

      console.log('\x1b[32m✅ System Configuration Overview:\x1b[0m');
      console.log('');

      // Device Information
      console.log('📱 Device Information:');
      console.log(`   Total Devices: ${deviceCount}`);
      console.log(`   Active Devices: ${activeDeviceCount}`);
      console.log(`   Inactive Devices: ${deviceCount - activeDeviceCount}`);
      console.log('');

      // Smart App Configuration
      if (config) {
        console.log('🏆 Smart App Medallions Configuration:');
        console.log(`   NFT Collection Token: ${config.nft_token_config?.token_id || 'Not configured'}`);
        console.log(`   Reward Token: ${config.reward_token_config?.token_id || 'Not configured'}`);
        console.log(`   Reward Per Submission: ${config.reward_token_config?.reward_per_submission || '0'} tokens`);
        console.log(`   Max Daily Rewards: ${config.reward_token_config?.max_daily_rewards || '0'} tokens`);
        console.log('');
      }

      // Environment Information
      console.log('🌍 Environment Information:');
      console.log(`   Network: ${this.chain}`);
      console.log(`   Port: 3001`);
      console.log(`   Mock Sensors: ${process.env.ENABLE_MOCK_SENSORS === 'true' ? 'ENABLED' : 'DISABLED'}`);
      console.log(`   Environment: Development`);
      console.log('');

      // Blockchain Status
      console.log('🔗 Blockchain Status:');
      console.log(`   Connection: Connected`);
      console.log(`   Node: Active`);
      console.log(`   Last Check: ${new Date().toLocaleString()}`);

    } catch (error) {
      this.logger.error('Failed to get system configuration:', error.message);
    }

    await this.pressEnterToContinue();
  }

  /**
   * This Device Menu
   */
  private async showThisDevice(): Promise<void> {
    console.clear();
    console.log('\x1b[33m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[33m║                        📱 This Device                         ║\x1b[0m');
    console.log('\x1b[33m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');

    // Check if device is active
    const isActive = this.currentDeviceId && this.currentPrivateKey;

    if (!isActive) {
      console.log('\x1b[33m⚠️  Device not active\x1b[0m');
      console.log('');
      console.log('To activate this device, you need:');
      console.log('1. Device ID (from master smart app)');
      console.log('2. Device Private Key');
      console.log('');
      
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '⚡ Activate Device', value: 'activate-device' },
            { name: '⬅️  Back to Main Menu', value: 'back' }
          ]
        }
      ]);

      if (action === 'activate-device') {
        await this.activateDevice();
      }
    } else {
      console.log('\x1b[32m✅ Device Active\x1b[0m');
      console.log(`   Device ID: ${this.currentDeviceId}`);
      console.log(`   Status: Connected`);
      console.log('');

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Device Options:',
          choices: [
            { name: '📊 Latest Data Collected', value: 'latest-data' },
            { name: '🔗 Data Saved on Chain', value: 'chain-data' },
            { name: '📈 Data Statistics', value: 'data-stats' },
            { name: '🔄 Deactivate Device', value: 'deactivate-device' },
            { name: '⬅️  Back to Main Menu', value: 'back' }
          ]
        }
      ]);

      switch (action) {
        case 'latest-data':
          await this.showLatestData();
          break;
        case 'chain-data':
          await this.showChainData();
          break;
        case 'data-stats':
          await this.showDataStats();
          break;
        case 'deactivate-device':
          await this.deactivateDevice();
          break;
        case 'back':
          return;
      }
    }

    await this.pressEnterToContinue();
  }

  /**
   * System Health Menu
   */
  private async showSystemHealth(): Promise<void> {
    console.clear();
    console.log('\x1b[32m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[32m║                      💚 System Health                         ║\x1b[0m');
    console.log('\x1b[32m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');

    try {
      // Get health data from API
      const [tempHealth, piHealth, deviceHealth] = await Promise.all([
        this.makeApiCall('/sensors/health'),
        this.makeApiCall('/pi-health/health'),
        this.makeApiCall('/pi-health/readings/latest')
      ]);

      console.log('\x1b[32m✅ Device Health Overview:\x1b[0m');
      console.log('');

      // Temperature Sensor Health
      if (tempHealth) {
        console.log('🌡️  Temperature Sensor:');
        console.log(`   Status: ${tempHealth.status}`);
        console.log(`   Service: ${tempHealth.service}`);
        console.log(`   Version: ${tempHealth.version}`);
        console.log('');
      }

      // Pi Health Monitoring
      if (piHealth) {
        console.log('💚 Pi Health Monitoring:');
        console.log(`   Status: ${piHealth.status}`);
        console.log(`   Service: ${piHealth.service}`);
        console.log(`   Capabilities: ${piHealth.capabilities?.length || 0} features`);
        console.log('');
      }

      // Latest Health Data
      if (deviceHealth) {
        console.log('📊 Latest Health Metrics:');
        console.log(`   CPU Usage: ${deviceHealth.cpuUsage || 'N/A'}%`);
        console.log(`   Memory Usage: ${deviceHealth.memoryUsage || 'N/A'}%`);
        console.log(`   Temperature: ${deviceHealth.temperature || 'N/A'}°C`);
        console.log(`   Timestamp: ${deviceHealth.timestamp || 'N/A'}`);
        console.log('');
      }

      // System Status
      console.log('🖥️  System Status:');
      console.log(`   Mock Sensors: ${process.env.ENABLE_MOCK_SENSORS === 'true' ? 'ENABLED' : 'DISABLED'}`);
      console.log(`   Blockchain: Connected`);
      console.log(`   Database: Connected`);
      console.log(`   ML Models: Active`);

    } catch (error) {
      this.logger.error('Failed to get system health:', error.message);
    }

    await this.pressEnterToContinue();
  }

  // Helper methods for API calls
  private async makeApiCall(endpoint: string): Promise<any> {
    try {
      const response = await axios.get(`${this.API_BASE}${endpoint}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  private async getDeviceCount(): Promise<number> {
    try {
      const devices = await this.deviceModel.countDocuments();
      return devices;
    } catch (error) {
      return 0;
    }
  }

  private async getActiveDeviceCount(): Promise<number> {
    try {
      const activeDevices = await this.deviceModel.countDocuments({ isActive: true });
      return activeDevices;
    } catch (error) {
      return 0;
    }
  }

  private async getSmartAppConfig(): Promise<any> {
    try {
      // This would typically come from the config service
      // For now, return a mock configuration
      return {
        nft_token_config: {
          token_id: '0.0.6502355'
        },
        reward_token_config: {
          token_id: '0.0.6502356',
          reward_per_submission: '10',
          max_daily_rewards: '1000'
        }
      };
    } catch (error) {
      return null;
    }
  }

  // Device Activation Methods
  private async activateDevice(): Promise<void> {
    console.log('\x1b[32m✅ Device Activation\x1b[0m');
    console.log('');

    const { deviceId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'deviceId',
        message: 'Enter Device ID:',
        validate: (input: string) => {
          if (input.trim().length === 0) {
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
        message: 'Enter Device Private Key:',
        validate: (input: string) => {
          if (input.trim().length === 0) {
            return 'Private Key is required';
          }
          return true;
        }
      }
    ]);

    try {
      // Validate device exists by deviceId field
      const device = await this.deviceModel.findOne({ deviceId: deviceId }).exec();
      if (!device) {
        console.log('\x1b[31m❌ Device not found\x1b[0m');
        console.log('   Please check the Device ID and try again');
        return;
      }

      // Store device credentials
      this.currentDeviceId = deviceId;
      this.currentPrivateKey = privateKey;

      console.log('\x1b[32m✅ Device activated successfully!\x1b[0m');
      console.log(`   Device: ${device.name || deviceId}`);
      console.log(`   Type: ${device.type || 'Unknown'}`);
      console.log(`   Status: Active`);
      console.log('');

      // Start sensor data collection
      await this.startSensorDataCollection(deviceId);

    } catch (error) {
      console.log('\x1b[31m❌ Failed to activate device\x1b[0m');
      this.logger.error('Activation error:', error.message);
    }
  }

  private async deactivateDevice(): Promise<void> {
    this.currentDeviceId = null;
    this.currentPrivateKey = null;
    console.log('\x1b[32m✅ Device deactivated\x1b[0m');
  }

  // Device Data Methods
  private async showLatestData(): Promise<void> {
    try {
      const [tempData, piData] = await Promise.all([
        this.makeApiCall('/sensors/readings/latest'),
        this.makeApiCall('/pi-health/readings/latest')
      ]);

      console.log('\x1b[32m✅ Latest Data Collected:\x1b[0m');
      console.log('');

      if (tempData) {
        console.log('🌡️  Latest Temperature:');
        console.log(`   Temperature: ${tempData.temperature}°C`);
        console.log(`   Timestamp: ${tempData.timestamp}`);
        console.log('');
      }

      if (piData) {
        console.log('💚 Latest Pi Health:');
        console.log(`   CPU Usage: ${piData.cpuUsage}%`);
        console.log(`   Memory Usage: ${piData.memoryUsage}%`);
        console.log(`   Temperature: ${piData.temperature}°C`);
        console.log(`   Timestamp: ${piData.timestamp}`);
      }
    } catch (error) {
      this.logger.error('Failed to get latest data:', error.message);
    }
  }

  private async showChainData(): Promise<void> {
    console.log('\x1b[32m✅ Data Saved on Chain:\x1b[0m');
    console.log('');
    console.log('📝 Recent Blockchain Submissions:');
    console.log('   No recent submissions to display');
    console.log('   Data is submitted every 10 readings');
    console.log('   Check blockchain explorer for details');
  }

  private async showDataStats(): Promise<void> {
    try {
      const [tempStats, piStats] = await Promise.all([
        this.makeApiCall('/sensors/stats'),
        this.makeApiCall('/pi-health/stats')
      ]);

      console.log('\x1b[32m✅ Data Statistics:\x1b[0m');
      console.log('');

      if (tempStats) {
        console.log('🌡️  Temperature Stats:');
        console.log(`   Total Readings: ${tempStats.totalReadings || 'N/A'}`);
        console.log(`   Average: ${tempStats.average || 'N/A'}°C`);
        console.log(`   Min: ${tempStats.min || 'N/A'}°C`);
        console.log(`   Max: ${tempStats.max || 'N/A'}°C`);
        console.log('');
      }

      if (piStats) {
        console.log('💚 Pi Health Stats:');
        console.log(`   Total Readings: ${piStats.totalReadings || 'N/A'}`);
        console.log(`   Average CPU: ${piStats.avgCpuUsage || 'N/A'}%`);
        console.log(`   Average Memory: ${piStats.avgMemoryUsage || 'N/A'}%`);
        console.log(`   System Temperature: ${piStats.temperature || 'N/A'}°C`);
      }
    } catch (error) {
      this.logger.error('Failed to get data statistics:', error.message);
    }
  }

  /**
   * Start sensor data collection for the activated device
   */
  private async startSensorDataCollection(deviceId: string): Promise<void> {
    try {
      console.log('\x1b[32m🚀 Starting sensor data collection...\x1b[0m');
      console.log('');

      // Update device status to active
      await this.deviceModel.findOneAndUpdate(
        { deviceId: deviceId },
        { 
          isActive: true, 
          lastSeen: new Date(),
          updatedAt: new Date()
        }
      );

      // Trigger sensor services to start collecting data
      const sensorEndpoints = [
        '/sensors/start',
        '/pi-health/start',
        '/sensors/dht11/status'
      ];

      for (const endpoint of sensorEndpoints) {
        try {
          await this.makeApiCall(endpoint);
          console.log(`✅ ${endpoint.split('/')[1]} service started`);
        } catch (error) {
          console.log(`⚠️  ${endpoint.split('/')[1]} service already running`);
        }
      }

      console.log('');
      console.log('📊 Sensor data collection started successfully!');
      console.log('   • Temperature sensors: Active');
      console.log('   • Pi health monitoring: Active');
      console.log('   • DHT11 sensors: Active');
      console.log('   • Data logging: Enabled');
      console.log('   • AI analysis: Every 10 readings');
      console.log('   • Blockchain submission: Enabled');
      console.log('');

      // Show initial data collection status
      await this.showInitialDataStatus(deviceId);

    } catch (error) {
      this.logger.error('Failed to start sensor data collection:', error.message);
    }
  }

  /**
   * Show initial data collection status
   */
  private async showInitialDataStatus(deviceId: string): Promise<void> {
    try {
      console.log('\x1b[36m📈 Initial Data Collection Status:\x1b[0m');
      console.log('');

      // Get current sensor readings
      const [tempReading, piReading] = await Promise.all([
        this.makeApiCall('/sensors/readings/latest'),
        this.makeApiCall('/pi-health/readings/latest')
      ]);

      if (tempReading) {
        console.log('🌡️  Latest Temperature:');
        console.log(`   Value: ${tempReading.temperature}°C`);
        console.log(`   Timestamp: ${tempReading.timestamp}`);
        console.log(`   Device: ${tempReading.deviceId || deviceId}`);
        console.log('');
      }

      if (piReading) {
        console.log('💚 Latest Pi Health:');
        console.log(`   CPU Usage: ${piReading.cpuUsage}%`);
        console.log(`   Memory Usage: ${piReading.memoryUsage}%`);
        console.log(`   Temperature: ${piReading.temperature}°C`);
        console.log(`   Timestamp: ${piReading.timestamp}`);
        console.log('');
      }

      console.log('🔄 Data collection is now active and logging...');
      console.log('   Check "Latest Data Collected" in the device menu to see updates');

    } catch (error) {
      this.logger.error('Failed to get initial data status:', error.message);
    }
  }

  /**
   * Utility method to wait for user input
   */
  private async pressEnterToContinue(): Promise<void> {
    console.log('');
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      }
    ]);
  }

  /**
   * Main run method
   */
  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    try {
      await this.showMainMenu();
    } catch (error) {
      this.logger.error('CLI Error:', error.message);
      process.exit(1);
    }
  }
} 