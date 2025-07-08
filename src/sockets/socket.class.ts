/**
 * @module Web3Socket
 * @description WebSocket client for real-time communication
 * 
 * This module provides a WebSocket client for real-time communication
 * with the application's backend. It handles connection management,
 * authentication, and event processing for WebSocket events.
 */
import { LoggerHelper } from '@hsuite/helpers';
import { Injectable } from '@nestjs/common';
import { Socket, io } from 'socket.io-client';

/**
 * @class Web3Socket
 * @description WebSocket client for real-time web3 events
 * 
 * The Web3Socket class provides a client for real-time communication
 * with the application's backend through WebSockets. It manages the
 * connection lifecycle, handles authentication, and processes events.
 * 
 * This class is used to receive real-time updates for web3-related events,
 * such as subscription events, blockchain state changes, and other
 * real-time notifications.
 */
@Injectable()
export class Web3Socket {
  /**
   * @property {LoggerHelper} logger - Logger instance for this service
   * @private
   */
  private logger: LoggerHelper = new LoggerHelper(Web3Socket.name);
  
  /**
   * @property {string} accessToken - Authentication token for WebSocket connection
   * @private
   */
  private accessToken: string;
  
  /**
   * @property {Socket} socket - Socket.io client instance
   * @private
   */
  private socket: Socket;
  
  /**
   * @property {string} url - WebSocket server URL
   * @private
   */
  private url: string;
  
  /**
   * @property {string} topic - WebSocket topic/namespace
   * @private
   */
  private topic: string;

  /**
   * @constructor
   * @description Creates a new WebSocket client and establishes connection
   * 
   * @param {string} url - The URL of the WebSocket server
   * @param {string} topic - The topic/namespace to connect to
   * @param {string} accessToken - Authentication token for connection
   */
  constructor(
    url: string,
    topic: string,
    accessToken: string
  ) {
    this.url = url;
    this.topic = topic;
    this.accessToken = accessToken;
    this.socket = this.init();
  }

  /**
   * @method init
   * @description Initializes the WebSocket connection
   * 
   * This method establishes a WebSocket connection to the specified server
   * and sets up event handlers for connection events. It handles the
   * protocol conversion (http/https to ws/wss) and authentication.
   * 
   * @returns {Socket} The initialized Socket.io client instance
   * @private
   */
  private init() {
    let socketUrl = this.url.replace('https://', 'wss://').replace('http://', 'ws://');

    this.socket = io(`${socketUrl}/${this.topic}`, {
      upgrade: false,
      transports: ["websocket"],
      auth: {
        accessToken: this.accessToken
      }
    });

    this.socket.on("connect", async () => {
      this.logger.verbose(`Connected to socket.`);
    });

    this.socket.on("disconnect", async (event) => {
      this.logger.verbose(`Disconnected from socket.`);
    });

    return this.socket;
  }

  /**
   * @method getSocket
   * @description Returns the Socket.io client instance
   * 
   * This method provides access to the underlying Socket.io client instance,
   * allowing consumers to add their own event listeners and emit events.
   * 
   * @returns {Socket} The Socket.io client instance
   */
  getSocket() {
    return this.socket;
  };
}