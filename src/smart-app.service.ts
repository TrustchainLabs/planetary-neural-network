/**
 * @module SmartAppService
 * @description Main service for the DAO application
 * 
 * This service handles core functionality for the DAO application, including:
 * - Initialization of required resources
 * - WebSocket communication
 * - Application identification and status
 * - Integration with Hedera Hashgraph services
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientService } from '@hsuite/client';
import { Web3Socket } from './sockets/socket.class';
import { SmartConfigService } from '@hsuite/smart-config';
import { LoggerHelper } from '@hsuite/helpers';

/**
 * @class SmartAppService
 * @description Core service implementing application business logic
 * 
 * The SmartAppService provides core functionality for the DAO application,
 * managing Hedera Hashgraph connectivity, WebSocket communication, and
 * application status information. It initializes required resources upon
 * module initialization.
 * 
 * @implements {OnModuleInit}
 */
@Injectable()
export class SmartAppService implements OnModuleInit {
  /**
   * @property {LoggerHelper} logger - Logger instance for this service
   * @private
   */
  private logger: LoggerHelper = new LoggerHelper(SmartAppService.name);
  
  /**
   * @property {Web3Socket} web3Socket - WebSocket connection for web3 events
   * @private
   */
  private web3Socket: Web3Socket;

  /**
   * @constructor
   * @param {ClientService} smartClient - Client service for API communication
   * @param {SmartConfigService} smartConfigService - Configuration service
   * @param {SmartNodeSdkService} smartNodeSdkService - Smart Node SDK service
   */
  constructor(
    private readonly smartClient: ClientService,
    private readonly smartConfigService: SmartConfigService
  ) {}

  /**
   * @method initSocket
   * @description Initializes the WebSocket connection for real-time events
   * 
   * This method creates a new WebSocket connection if one doesn't exist,
   * configures event listeners, and returns the initialized socket.
   * 
   * @returns {Web3Socket} The initialized WebSocket instance
   * @private
   */
  private initSocket() {
    if (!this.web3Socket) {
      this.web3Socket = new Web3Socket(
        'http://smart_registry-smart_node-1:1234',
        'web3_subscriptions',
        this.smartClient.login.accessToken
      );

      this.web3Socket.getSocket().on('web3_subscriptions_events', (event) => {
        this.logger.verbose(`event: ${JSON.stringify(event)}`);
      });
    }

    return this.web3Socket;
  }

  /**
   * @method onModuleInit
   * @description Lifecycle hook that runs when the module is initialized
   * 
   * This method initializes necessary resources when the module starts.
   * It attempts to get the user's profile information and logs any errors.
   * 
   * @returns {Promise<void>}
   */
  async onModuleInit() {
    // await this.initSocket();

    // try {
    //   let session = await this.smartClient.axios.get('/auth/profile');
    //   console.log(JSON.stringify(session.data));
    // } catch (error) {
    //   if (error instanceof AxiosError) {
    //     this.logger.error(error.response.data.message);
    //   } else {
    //     this.logger.error(error.message);
    //   }
    // }
  }

  /**
   * @method smartAppIdentifier
   * @description Retrieves application identifier information
   * 
   * This method fetches the application's identifier information,
   * including subscription status and other relevant details.
   * 
   * @returns {Promise<any>} Application identifier information
   */
  async smartAppIdentifier(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        let response = await this.smartClient.axios.get(
          '/subscriptions/web3/status'
        );

        resolve(response.data);
      } catch (error) {
        reject(error);
      }
    });
  }
}
