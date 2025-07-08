import { Test, TestingModule } from '@nestjs/testing';
import { SmartAppService } from './smart-app.service';
import { ClientService } from '@hsuite/client';
import { SmartConfigService } from '@hsuite/smart-config';
import { SmartNodeSdkService } from '@hsuite/smartnode-sdk';
import { Web3Socket } from './sockets/socket.class';
import { Logger } from '@nestjs/common';

// Mock implementation of the Web3Socket class
jest.mock('./sockets/socket.class', () => {
  const mockSocket = {
    on: jest.fn(),
  };
  
  return {
    Web3Socket: jest.fn().mockImplementation(() => ({
      getSocket: jest.fn().mockReturnValue(mockSocket),
    })),
  };
});

describe('SmartAppService', () => {
  let service: SmartAppService;
  let clientService: ClientService;
  let configService: SmartConfigService;
  let nodeSdkService: SmartNodeSdkService;
  
  // Mock operator data
  const mockOperator = {
    accountId: '0.0.123456',
    privateKey: 'mockPrivateKey',
  };
  
  // Mock client access token
  const mockAccessToken = 'mock-access-token';
  
  // Mock axios response data
  const mockIdentifierData = {
    appId: 'dao-app',
    status: 'active',
    subscription: {
      active: true,
      expiresAt: '2023-12-31',
    },
  };
  
  beforeEach(async () => {
    // Create mock implementations
    const mockClientService = {
      login: { accessToken: mockAccessToken },
      axios: {
        get: jest.fn().mockImplementation((url) => {
          if (url === '/auth/profile') {
            return Promise.resolve({ data: { username: 'test-user' } });
          } else if (url === '/subscriptions/web3/status') {
            return Promise.resolve({ data: mockIdentifierData });
          }
          return Promise.reject(new Error('Unknown URL'));
        }),
      },
    };
    
    const mockConfigService = {
      getEnvironment: jest.fn().mockReturnValue('test'),
      getOperator: jest.fn().mockReturnValue(mockOperator),
    };
    
    const mockNodeSdkService = {};
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartAppService,
        { provide: ClientService, useValue: mockClientService },
        { provide: SmartConfigService, useValue: mockConfigService },
        { provide: SmartNodeSdkService, useValue: mockNodeSdkService },
      ],
    }).compile();
    
    service = module.get<SmartAppService>(SmartAppService);
    clientService = module.get<ClientService>(ClientService);
    configService = module.get<SmartConfigService>(SmartConfigService);
    nodeSdkService = module.get<SmartNodeSdkService>(SmartNodeSdkService);
    
    // Spy on logger to prevent actual logging during tests
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  it('should initialize with correct environment and operator', () => {
    // Verify the configuration service was called
    expect(configService.getEnvironment).toHaveBeenCalled();
    expect(configService.getOperator).toHaveBeenCalled();
  });
  
  describe('initSocket', () => {
    it('should initialize and return a Web3Socket instance', () => {
      // Access the private method using type assertion
      const initSocketMethod = (service as any).initSocket.bind(service);
      const socket = initSocketMethod();
      
      // Verify Web3Socket constructor was called with correct parameters
      expect(Web3Socket).toHaveBeenCalledWith(
        'http://smart_registry-smart_node-1:1234',
        'web3_subscriptions',
        mockAccessToken
      );
      
      // Verify the socket is returned
      expect(socket).toBeDefined();
      expect(socket.getSocket).toBeDefined();
      
      // Verify event listener is registered
      const mockSocketInstance = socket.getSocket();
      expect(mockSocketInstance.on).toHaveBeenCalledWith(
        'web3_subscriptions_events',
        expect.any(Function)
      );
    });
    
    it('should log events received through the socket', () => {
      // Access the private method using type assertion
      const initSocketMethod = (service as any).initSocket.bind(service);
      const socket = initSocketMethod();
      
      // Get the socket instance
      const mockSocketInstance = socket.getSocket();
      
      // Extract the event handler (the second argument passed to mockSocketInstance.on)
      const eventHandler = mockSocketInstance.on.mock.calls[0][1];
      
      // Call the event handler with a mock event
      const mockEvent = { type: 'test-event', data: { value: 'test-data' } };
      eventHandler(mockEvent);
      
      // Verify the event was logged
      expect(Logger.prototype.verbose).toHaveBeenCalledWith(`event: ${JSON.stringify(mockEvent)}`);
    });
    
    it('should reuse existing socket if already initialized', () => {
      const initSocketMethod = (service as any).initSocket.bind(service);
      
      // Call twice
      const socket1 = initSocketMethod();
      const socket2 = initSocketMethod();
      
      // Verify constructor was called only once
      expect(Web3Socket).toHaveBeenCalledTimes(1);
      
      // Verify both calls return the same instance
      expect(socket1).toBe(socket2);
    });
  });
  
  describe('onModuleInit', () => {
    it('should initialize resources', async () => {
      // Create a spy for initSocket (which is currently commented out in the service)
      const initSocketSpy = jest.spyOn(service as any, 'initSocket');
      
      await service.onModuleInit();
      
      // The service has initSocket commented out, so it shouldn't be called
      expect(initSocketSpy).not.toHaveBeenCalled();
      
      // If we uncomment the profile fetch in the service, these would be the tests:
      // expect(clientService.axios.get).toHaveBeenCalledWith('/auth/profile');
    });
    
    // Uncomment these tests if the code in onModuleInit is uncommented
    /*
    it('should handle API errors correctly', async () => {
      // Mock API error
      const axiosError = new AxiosError();
      axiosError.response = {
        data: { message: 'Authentication failed' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {},
      };
      
      jest.spyOn(clientService.axios, 'get').mockRejectedValue(axiosError);
      
      await service.onModuleInit();
      
      // Verify error was logged
      expect(Logger.prototype.error).toHaveBeenCalledWith('Authentication failed');
    });
    
    it('should handle non-Axios errors correctly', async () => {
      // Mock generic error
      const genericError = new Error('Network error');
      
      jest.spyOn(clientService.axios, 'get').mockRejectedValue(genericError);
      
      await service.onModuleInit();
      
      // Verify error was logged
      expect(Logger.prototype.error).toHaveBeenCalledWith('Network error');
    });
    */
  });
  
  describe('smartAppIdentifier', () => {
    it('should return application identifier information', async () => {
      const result = await service.smartAppIdentifier();
      
      // Verify API was called
      expect(clientService.axios.get).toHaveBeenCalledWith('/subscriptions/web3/status');
      
      // Verify result matches mock data
      expect(result).toEqual(mockIdentifierData);
    });
    
    it('should reject with error on API failure', async () => {
      // Mock API error
      const error = new Error('API unavailable');
      jest.spyOn(clientService.axios, 'get').mockRejectedValue(error);
      
      // Verify method rejects with the error
      await expect(service.smartAppIdentifier()).rejects.toThrow('API unavailable');
    });
  });
}); 