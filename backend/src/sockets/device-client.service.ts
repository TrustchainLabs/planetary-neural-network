/**
 * @module DeviceClientService
 * @description WebSocket client service for local device control
 * 
 * This service runs on the Raspberry Pi device and connects to the central
 * WebSocket server to receive control commands. It handles the local execution
 * of device operations when commands are received from the backend.
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { LoggerHelper } from '@hsuite/helpers';
import { Socket, io } from 'socket.io-client';
import { IDeviceControlMessage, IDeviceStatusMessage } from './device-control.gateway';

/**
 * @interface IDeviceConfig
 * @description Configuration for device client connection
 */
export interface IDeviceConfig {
  deviceId: string;
  medallionId?: string;
  authToken?: string;
  serverUrl: string;
  namespace?: string;
}

/**
 * @interface IDeviceOperations
 * @description Interface for device-specific operations
 */
export interface IDeviceOperations {
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
  getStatus(): Promise<string>;
}

/**
 * @class DeviceClientService
 * @description WebSocket client for local device control
 * 
 * This service provides WebSocket client functionality for IoT devices
 * running on Raspberry Pi. It connects to the central backend and listens
 * for control commands, executing them locally on the device.
 * 
 * Features:
 * - Auto-connection and reconnection to central server
 * - Device registration with medallion ID
 * - Local command execution
 * - Status reporting
 * - Debug logging for troubleshooting
 */
@Injectable()
export class DeviceClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: LoggerHelper = new LoggerHelper(DeviceClientService.name);
  private socket: Socket;
  private config: IDeviceConfig;
  private deviceOperations: IDeviceOperations;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  /**
   * @constructor
   * @description Creates a new device client service instance
   */
  constructor() {
    // Default operations - should be overridden by actual device implementations
    this.deviceOperations = {
      start: async () => {
        this.logger.debug('Default start operation - override this method');
        return true;
      },
      stop: async () => {
        this.logger.debug('Default stop operation - override this method');
        return true;
      },
      getStatus: async () => {
        return 'ready';
      }
    };
  }

  /**
   * @method onModuleInit
   * @description Lifecycle hook - initialize the service
   */
  async onModuleInit() {
    this.logger.debug('DeviceClientService initialized');
  }

  /**
   * @method onModuleDestroy
   * @description Lifecycle hook - cleanup on module destruction
   */
  async onModuleDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * @method configure
   * @description Configures the device client with connection parameters
   * 
   * @param {IDeviceConfig} config - Device configuration
   * @param {IDeviceOperations} operations - Device-specific operations
   */
  configure(config: IDeviceConfig, operations?: IDeviceOperations) {
    this.config = config;
    
    if (operations) {
      this.deviceOperations = operations;
    }

    this.logger.debug(`Device configured: ${config.deviceId} ${config.medallionId ? `(medallion: ${config.medallionId})` : ''}`);
  }

  /**
   * @method connect
   * @description Connects to the WebSocket server
   * 
   * Establishes connection to the central WebSocket server and sets up
   * event handlers for device control and status reporting.
   * 
   * @returns {Promise<boolean>} True if connection successful
   */
  async connect(): Promise<boolean> {
    if (!this.config) {
      throw new Error('Device must be configured before connecting');
    }

    try {
      const namespace = this.config.namespace || '/device-control';
      const socketUrl = this.config.serverUrl.replace('https://', 'wss://').replace('http://', 'ws://');

      this.logger.debug(`Connecting to ${socketUrl}${namespace}...`);

      this.socket = io(`${socketUrl}${namespace}`, {
        upgrade: false,
        transports: ["websocket"],
        auth: {
          deviceId: this.config.deviceId,
          medallionId: this.config.medallionId,
          authToken: this.config.authToken
        },
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      // Set up event handlers
      this.setupEventHandlers();

      return new Promise((resolve) => {
        this.socket.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.logger.debug(`Connected to server as device: ${this.config.deviceId}`);
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          this.logger.error(`Connection failed: ${error.message}`);
          resolve(false);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to connect: ${error.message}`);
      return false;
    }
  }

  /**
   * @method setupEventHandlers
   * @description Sets up WebSocket event handlers
   * @private
   */
  private setupEventHandlers() {
    // Handle connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.debug(`Device ${this.config.deviceId} connected to server`);
      this.sendStatusUpdate('online');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.logger.debug(`Device ${this.config.deviceId} disconnected: ${reason}`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.logger.debug(`Device ${this.config.deviceId} reconnected after ${attemptNumber} attempts`);
      this.sendStatusUpdate('online');
    });

    this.socket.on('reconnect_error', (error) => {
      this.reconnectAttempts++;
      this.logger.error(`Reconnection attempt ${this.reconnectAttempts} failed: ${error.message}`);
    });

    // Handle registration confirmation
    this.socket.on('registration:success', (data) => {
      this.logger.debug(`Registration confirmed: ${JSON.stringify(data)}`);
    });

    // Handle device control commands
    this.socket.on('device:control', async (command: IDeviceControlMessage) => {
      await this.handleControlCommand(command);
    });
  }

  /**
   * @method handleControlCommand
   * @description Handles incoming control commands
   * 
   * @param {IDeviceControlMessage} command - The control command to execute
   * @private
   */
  private async handleControlCommand(command: IDeviceControlMessage) {
    this.logger.debug(`Received control command: ${JSON.stringify(command)}`);

    try {
      // Verify command is for this device
      if (command.id !== this.config.deviceId) {
        this.logger.warn(`Command received for different device: ${command.id}`);
        return;
      }

      this.sendStatusUpdate(command.action === 'start' ? 'starting' : 'stopping');

      let success = false;
      
      // Execute the command
      switch (command.action) {
        case 'start':
          success = await this.deviceOperations.start();
          break;
        case 'stop':
          success = await this.deviceOperations.stop();
          break;
        default:
          this.logger.error(`Unknown command action: ${command.action}`);
          this.sendStatusUpdate('error', `Unknown action: ${command.action}`);
          return;
      }

      // Report status based on execution result
      if (success) {
        const status = await this.deviceOperations.getStatus();
        this.sendStatusUpdate(status as any);
        this.logger.debug(`Command ${command.action} executed successfully`);
      } else {
        this.sendStatusUpdate('error', `Failed to execute ${command.action}`);
        this.logger.error(`Command ${command.action} execution failed`);
      }
    } catch (error) {
      this.sendStatusUpdate('error', error.message);
      this.logger.error(`Error executing command: ${error.message}`);
    }
  }

  /**
   * @method sendStatusUpdate
   * @description Sends device status update to server
   * 
   * @param {string} status - Current device status
   * @param {string} message - Optional status message
   */
  sendStatusUpdate(status: 'online' | 'offline' | 'starting' | 'stopping' | 'error', message?: string) {
    if (!this.isConnected || !this.socket) {
      this.logger.warn('Cannot send status update - not connected');
      return;
    }

    const statusUpdate: IDeviceStatusMessage = {
      deviceId: this.config.deviceId,
      status,
      medallionId: this.config.medallionId,
      timestamp: new Date().toISOString(),
      message
    };

    this.socket.emit('device:status', statusUpdate);
    this.logger.debug(`Status update sent: ${status}${message ? ` - ${message}` : ''}`);
  }

  /**
   * @method disconnect
   * @description Disconnects from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.sendStatusUpdate('offline');
      this.socket.disconnect();
      this.isConnected = false;
      this.logger.debug(`Device ${this.config.deviceId} disconnected`);
    }
  }

  /**
   * @method isDeviceConnected
   * @description Checks if device is connected to server
   * 
   * @returns {boolean} True if connected
   */
  isDeviceConnected(): boolean {
    return this.isConnected;
  }

  /**
   * @method getConfig
   * @description Gets current device configuration
   * 
   * @returns {IDeviceConfig} Current configuration
   */
  getConfig(): IDeviceConfig {
    return this.config;
  }
}