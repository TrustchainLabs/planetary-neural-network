/**
 * @module DeviceControlGateway
 * @description WebSocket gateway for real-time device control communication
 * 
 * This gateway provides WebSocket endpoints for controlling IoT devices remotely.
 * It handles device registration, control commands, and status updates between
 * the backend and connected devices.
 */
import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LoggerHelper } from '@hsuite/helpers';
import { Injectable } from '@nestjs/common';

/**
 * @interface IDeviceControlMessage
 * @description Message structure for device control commands
 */
export interface IDeviceControlMessage {
  id: string;
  action: 'start' | 'stop';
  medallionId?: string;
  timestamp?: string;
}

/**
 * @interface IDeviceStatusMessage
 * @description Message structure for device status updates
 */
export interface IDeviceStatusMessage {
  deviceId: string;
  status: 'online' | 'offline' | 'starting' | 'stopping' | 'error';
  medallionId?: string;
  timestamp: string;
  message?: string;
}

/**
 * @interface IDeviceRegistration
 * @description Device registration data for WebSocket connection
 */
export interface IDeviceRegistration {
  deviceId: string;
  medallionId?: string;
  authToken?: string;
}

/**
 * @class DeviceControlGateway
 * @description WebSocket gateway for device control operations
 * 
 * This gateway manages WebSocket connections for IoT device control.
 * It provides real-time communication between the backend API and
 * connected devices running on Raspberry Pi units.
 * 
 * Features:
 * - Device registration and authentication
 * - Real-time control command dispatch
 * - Device status monitoring
 * - Connection management
 */
@Injectable()
@WebSocketGateway({
  namespace: '/device-control',
  cors: {
    origin: '*',
    credentials: true
  }
})
export class DeviceControlGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger: LoggerHelper = new LoggerHelper(DeviceControlGateway.name);
  private connectedDevices: Map<string, Socket> = new Map();
  private deviceRegistrations: Map<string, IDeviceRegistration> = new Map();

  @WebSocketServer()
  server: Server;

  /**
   * @method handleConnection
   * @description Handles new WebSocket connections
   * 
   * @param {Socket} client - The connecting WebSocket client
   */
  handleConnection(client: Socket) {
    this.logger.debug(`Device attempting to connect: ${client.id}`);
    
    // Extract auth info from handshake
    const { deviceId, medallionId, authToken } = client.handshake.auth || {};
    
    if (deviceId) {
      this.connectedDevices.set(deviceId, client);
      this.deviceRegistrations.set(deviceId, { deviceId, medallionId, authToken });
      
      this.logger.debug(`Device registered: ${deviceId} ${medallionId ? `(medallion: ${medallionId})` : ''}`);
      
      // Acknowledge successful registration
      client.emit('registration:success', {
        deviceId,
        medallionId,
        timestamp: new Date().toISOString()
      });
    } else {
      this.logger.warn(`Device connection rejected - missing deviceId: ${client.id}`);
      client.disconnect();
    }
  }

  /**
   * @method handleDisconnect
   * @description Handles WebSocket disconnections
   * 
   * @param {Socket} client - The disconnecting WebSocket client
   */
  handleDisconnect(client: Socket) {
    // Find and remove the device from our maps
    for (const [deviceId, socket] of this.connectedDevices.entries()) {
      if (socket.id === client.id) {
        this.connectedDevices.delete(deviceId);
        this.deviceRegistrations.delete(deviceId);
        this.logger.debug(`Device disconnected: ${deviceId}`);
        break;
      }
    }
  }

  /**
   * @method handleDeviceStatus
   * @description Handles device status updates from connected devices
   * 
   * @param {Socket} client - The WebSocket client
   * @param {IDeviceStatusMessage} data - Status update data
   */
  @SubscribeMessage('device:status')
  handleDeviceStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: IDeviceStatusMessage
  ) {
    this.logger.debug(`Device status update: ${data.deviceId} - ${data.status}`);
    
    // Broadcast status to interested parties (admin dashboard, etc.)
    this.server.emit('device:status:broadcast', data);
  }

  /**
   * @method sendControlCommand
   * @description Sends a control command to a specific device
   * 
   * This method is called by the DevicesController to send control commands
   * to connected devices. It finds the device's WebSocket connection and
   * emits the control event.
   * 
   * @param {string} deviceId - The target device ID
   * @param {IDeviceControlMessage} command - The control command
   * @returns {boolean} True if command was sent, false if device not connected
   */
  sendControlCommand(deviceId: string, command: IDeviceControlMessage): boolean {
    const deviceSocket = this.connectedDevices.get(deviceId);
    
    if (!deviceSocket) {
      this.logger.warn(`Device not connected: ${deviceId}`);
      return false;
    }

    this.logger.debug(`Sending control command to device ${deviceId}: ${command.action}`);
    
    // Add timestamp to command
    command.timestamp = new Date().toISOString();
    
    // Send command to device
    deviceSocket.emit('device:control', command);
    
    return true;
  }

  /**
   * @method getConnectedDevices
   * @description Gets list of currently connected devices
   * 
   * @returns {IDeviceRegistration[]} Array of connected device registrations
   */
  getConnectedDevices(): IDeviceRegistration[] {
    return Array.from(this.deviceRegistrations.values());
  }

  /**
   * @method isDeviceConnected
   * @description Checks if a device is currently connected
   * 
   * @param {string} deviceId - The device ID to check
   * @returns {boolean} True if device is connected
   */
  isDeviceConnected(deviceId: string): boolean {
    return this.connectedDevices.has(deviceId);
  }
}