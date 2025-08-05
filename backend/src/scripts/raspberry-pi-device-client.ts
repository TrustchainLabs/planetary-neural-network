#!/usr/bin/env ts-node
/**
 * @module RaspberryPiDeviceClient
 * @description Example implementation of device client for Raspberry Pi
 * 
 * This script demonstrates how to use the DeviceClientService to connect
 * a Raspberry Pi device to the central WebSocket server and handle control
 * commands for IoT sensors like DHT11 temperature sensors.
 * 
 * Usage:
 * ts-node raspberry-pi-device-client.ts --device-id=<id> --medallion-id=<id> --server-url=<url>
 */
import { DeviceClientService, IDeviceOperations } from '../sockets/device-client.service';
import { LoggerHelper } from '@hsuite/helpers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * @class RaspberryPiDeviceOperations
 * @description Device operations implementation for Raspberry Pi sensors
 */
class RaspberryPiDeviceOperations implements IDeviceOperations {
  private logger: LoggerHelper = new LoggerHelper('RaspberryPiDeviceOperations');
  private isRunning: boolean = false;
  private sensorProcess: any = null;

  /**
   * @method start
   * @description Starts the sensor data collection
   */
  async start(): Promise<boolean> {
    try {
      if (this.isRunning) {
        this.logger.debug('Sensor already running');
        return true;
      }

      this.logger.debug('Starting DHT11 sensor data collection...');
      
      // Check if Python script exists
      const scriptPath = path.join(__dirname, '../modules/sensors/scripts/pi4_dht11_sensor.py');
      if (!fs.existsSync(scriptPath)) {
        this.logger.error(`Python sensor script not found: ${scriptPath}`);
        return false;
      }

      // Start the Python sensor script
      const { spawn } = require('child_process');
      this.sensorProcess = spawn('python3', [scriptPath], {
        stdio: 'pipe'
      });

      this.sensorProcess.stdout.on('data', (data) => {
        this.logger.debug(`Sensor output: ${data.toString()}`);
      });

      this.sensorProcess.stderr.on('data', (data) => {
        this.logger.error(`Sensor error: ${data.toString()}`);
      });

      this.sensorProcess.on('close', (code) => {
        this.logger.debug(`Sensor process exited with code ${code}`);
        this.isRunning = false;
        this.sensorProcess = null;
      });

      this.isRunning = true;
      this.logger.debug('DHT11 sensor started successfully');
      return true;
    } catch (error) {
      this.logger.error(`Failed to start sensor: ${error.message}`);
      return false;
    }
  }

  /**
   * @method stop
   * @description Stops the sensor data collection
   */
  async stop(): Promise<boolean> {
    try {
      if (!this.isRunning) {
        this.logger.debug('Sensor already stopped');
        return true;
      }

      this.logger.debug('Stopping DHT11 sensor data collection...');
      
      if (this.sensorProcess) {
        this.sensorProcess.kill('SIGTERM');
        
        // Wait for process to exit gracefully
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (this.sensorProcess) {
              this.sensorProcess.kill('SIGKILL');
            }
            resolve(true);
          }, 5000);

          this.sensorProcess.on('exit', () => {
            clearTimeout(timeout);
            resolve(true);
          });
        });
      }

      this.isRunning = false;
      this.sensorProcess = null;
      this.logger.debug('DHT11 sensor stopped successfully');
      return true;
    } catch (error) {
      this.logger.error(`Failed to stop sensor: ${error.message}`);
      return false;
    }
  }

  /**
   * @method getStatus
   * @description Gets current sensor status
   */
  async getStatus(): Promise<string> {
    return this.isRunning ? 'online' : 'offline';
  }
}

/**
 * @function parseArguments
 * @description Parses command line arguments
 */
function parseArguments(): { deviceId?: string; medallionId?: string; serverUrl?: string; authToken?: string } {
  const args = process.argv.slice(2);
  const result: any = {};

  args.forEach(arg => {
    if (arg.startsWith('--device-id=')) {
      result.deviceId = arg.split('=')[1];
    } else if (arg.startsWith('--medallion-id=')) {
      result.medallionId = arg.split('=')[1];
    } else if (arg.startsWith('--server-url=')) {
      result.serverUrl = arg.split('=')[1];
    } else if (arg.startsWith('--auth-token=')) {
      result.authToken = arg.split('=')[1];
    }
  });

  return result;
}

/**
 * @function loadConfigFromFile
 * @description Loads configuration from file if available
 */
function loadConfigFromFile(): any {
  try {
    const configPath = path.join(__dirname, '../config/device-config.json');
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('Failed to load config file:', error.message);
  }
  return {};
}

/**
 * @function main
 * @description Main function to run the device client
 */
async function main() {
  const logger = new LoggerHelper('RaspberryPiDeviceClient');
  
  try {
    // Parse command line arguments
    const args = parseArguments();
    
    // Load config from file as fallback
    const fileConfig = loadConfigFromFile();
    
    // Get environment variables as fallback
    const config = {
      deviceId: args.deviceId || fileConfig.deviceId || process.env.DEVICE_ID,
      medallionId: args.medallionId || fileConfig.medallionId || process.env.MEDALLION_ID,
      serverUrl: args.serverUrl || fileConfig.serverUrl || process.env.WEBSOCKET_SERVER_URL || 'ws://localhost:3000',
      authToken: args.authToken || fileConfig.authToken || process.env.DEVICE_AUTH_TOKEN
    };

    // Validate required configuration
    if (!config.deviceId) {
      throw new Error('Device ID is required. Provide via --device-id, config file, or DEVICE_ID env var');
    }

    if (!config.serverUrl) {
      throw new Error('Server URL is required. Provide via --server-url, config file, or WEBSOCKET_SERVER_URL env var');
    }

    logger.debug(`Starting device client for device: ${config.deviceId}`);
    logger.debug(`Medallion ID: ${config.medallionId || 'Not specified'}`);
    logger.debug(`Server URL: ${config.serverUrl}`);

    // Create device operations instance
    const deviceOperations = new RaspberryPiDeviceOperations();

    // Create and configure device client
    const deviceClient = new DeviceClientService();
    deviceClient.configure(config, deviceOperations);

    // Connect to server
    const connected = await deviceClient.connect();
    
    if (!connected) {
      throw new Error('Failed to connect to WebSocket server');
    }

    logger.debug('Device client connected successfully');
    logger.debug('Listening for control commands...');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.debug('Received SIGINT, shutting down gracefully...');
      await deviceOperations.stop();
      deviceClient.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.debug('Received SIGTERM, shutting down gracefully...');
      await deviceOperations.stop();
      deviceClient.disconnect();
      process.exit(0);
    });

    // Keep the process running
    logger.debug('Device client is running. Press Ctrl+C to stop.');
    
  } catch (error) {
    logger.error(`Device client failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { RaspberryPiDeviceOperations, main };