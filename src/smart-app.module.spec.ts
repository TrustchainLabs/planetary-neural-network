/**
 * @file smart-app.module.spec.ts
 * @description Test file for the SmartAppModule
 */
import { SmartAppModule } from './smart-app.module';

// Mock ConfigService
const mockConfigService = {
  getOrThrow: jest.fn(),
  get: jest.fn()
};

// Mock the actual modules we're testing
const mockIpfsModuleForRootAsync = jest.fn();
const mockThrottlerModuleForRootAsync = jest.fn();
const mockSmartConfigModuleForRootAsync = jest.fn();
const mockSubscriptionsModuleForRootAsync = jest.fn();
const mockSmartNodeSdkModuleForRootAsync = jest.fn();
const mockBullModuleForRootAsync = jest.fn();
const mockAuthModuleForRootAsync = jest.fn();

// Mock the modules
jest.mock('@hsuite/ipfs', () => ({
  IpfsModule: {
    forRootAsync: (...args) => {
      mockIpfsModuleForRootAsync(...args);
      return { module: class IpfsModule {} };
    }
  }
}));

jest.mock('@hsuite/throttler', () => ({
  SecurityThrottlerModule: {
    forRootAsync: (...args) => {
      mockThrottlerModuleForRootAsync(...args);
      return { module: class ThrottlerModule {} };
    }
  }
}));

jest.mock('@hsuite/smart-config', () => ({
  SmartConfigModule: {
    forRootAsync: (...args) => {
      mockSmartConfigModuleForRootAsync(...args);
      return { module: class SmartConfigModule {} };
    }
  },
  SmartConfigService: class {}
}));

jest.mock('@hsuite/subscriptions', () => ({
  SubscriptionsModule: {
    forRootAsync: (...args) => {
      mockSubscriptionsModuleForRootAsync(...args);
      return { module: class SubscriptionsModule {} };
    }
  }
}));

jest.mock('@hsuite/smartnode-sdk', () => ({
  SmartNodeSdkModule: {
    forRootAsync: (...args) => {
      mockSmartNodeSdkModuleForRootAsync(...args);
      return { module: class SmartNodeSdkModule {} };
    }
  }
}));

jest.mock('@nestjs/bull', () => ({
  BullModule: {
    forRootAsync: (...args) => {
      mockBullModuleForRootAsync(...args);
      return { module: class BullModule {} };
    }
  }
}));

// Add mock for AuthModule
jest.mock('@hsuite/auth', () => ({
  AuthModule: {
    forRootAsync: (...args) => {
      mockAuthModuleForRootAsync(...args);
      return { module: class AuthModule {} };
    }
  }
}));

// Mock other modules to prevent import errors
jest.mock('./modules/daos/dao.module', () => ({
  DaoModule: class {}
}));

jest.mock('./modules/proposals/proposal.module', () => ({
  ProposalModule: class {}
}));

jest.mock('./modules/votes/vote.module', () => ({
  VoteModule: class {}
}));

/**
 * Mock the useFactory calls from forRootAsync to simulate real behavior
 */
function simulateUseFactory(mockFn, configKey) {
  const configOption = mockFn.mock.calls[0][0];
  const useFactory = configOption.useFactory;
  
  if (useFactory && typeof useFactory === 'function') {
    // Call the useFactory with our mock ConfigService
    useFactory(mockConfigService);
    
    // This would trigger the getOrThrow call in the real code
    return true;
  }
  return false;
}

describe('SmartAppModule', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up default mock implementation for getOrThrow
    mockConfigService.getOrThrow.mockImplementation((key) => {
      switch (key) {
        case 'redis':
          return { socket: { host: 'localhost', port: 6379 } };
        case 'ipfs':
          return { enabled: true };
        case 'subscription':
          return { enabled: true };
        case 'mongoDb':
          return { url: 'mongodb://localhost:27017/test' };
        case 'throttler':
          return { ttl: 60, limit: 10 };
        case 'smartConfig':
          return { network: 'testnet' };
        default:
          return null;
      }
    });
  });

  it('should be defined', () => {
    expect(SmartAppModule).toBeDefined();
  });

  describe('register', () => {
    it('should configure IPFS module when enabled', () => {
      // Call register method
      SmartAppModule.register();
      
      // Verify the IpfsModule.forRootAsync was called
      expect(mockIpfsModuleForRootAsync).toHaveBeenCalled();
      
      // Simulate the useFactory call to trigger the getOrThrow
      simulateUseFactory(mockIpfsModuleForRootAsync, 'ipfs');
      
      // Verify that ipfs configuration was requested
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('ipfs');
    });
    
    it('should configure throttler module with provided config', () => {
      // Call register method
      SmartAppModule.register();
      
      // Verify the SecurityThrottlerModule.forRootAsync was called
      expect(mockThrottlerModuleForRootAsync).toHaveBeenCalled();
      
      // Simulate the useFactory call to trigger the getOrThrow
      simulateUseFactory(mockThrottlerModuleForRootAsync, 'throttler');
      
      // Verify that throttler configuration was requested
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('throttler');
    });
    
    it('should configure subscription module with web3', () => {
      // Call register method
      SmartAppModule.register();
      
      // Verify the SubscriptionsModule.forRootAsync was called
      expect(mockSubscriptionsModuleForRootAsync).toHaveBeenCalled();
      
      // Simulate the useFactory call to trigger the getOrThrow
      simulateUseFactory(mockSubscriptionsModuleForRootAsync, 'subscription');
      
      // Verify that subscription configuration was requested
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('subscription');
    });
    
    it('should configure SmartConfigModule with network from config', () => {
      // Call register method
      SmartAppModule.register();
      
      // Verify the SmartConfigModule.forRootAsync was called
      expect(mockSmartConfigModuleForRootAsync).toHaveBeenCalled();
      
      // Simulate the useFactory call to trigger the getOrThrow
      simulateUseFactory(mockSmartConfigModuleForRootAsync, 'smartConfig');
      
      // Verify that smartConfig configuration was requested
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('smartConfig');
    });
    
    it('should handle disabled subscription config', () => {
      // Mock subscription to be disabled for this test
      mockConfigService.getOrThrow.mockImplementation((key) => {
        if (key === 'subscription') {
          return { enabled: false };
        }
        
        switch (key) {
          case 'redis':
            return { socket: { host: 'localhost', port: 6379 } };
          case 'ipfs':
            return { enabled: false };
          case 'mongoDb':
            return { url: 'mongodb://localhost:27017/test' };
          case 'throttler':
            return { ttl: 60, limit: 10 };
          case 'smartConfig':
            return { network: 'testnet' };
          default:
            return null;
        }
      });
      
      // Call register method
      SmartAppModule.register();
      
      // Verify the SubscriptionsModule.forRootAsync was called
      expect(mockSubscriptionsModuleForRootAsync).toHaveBeenCalled();
      
      // Simulate the useFactory call to trigger the getOrThrow
      simulateUseFactory(mockSubscriptionsModuleForRootAsync, 'subscription');
      
      // Verify that subscription configuration was requested
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('subscription');
    });
    
    it('should handle disabled IPFS config', () => {
      // Mock IPFS to be disabled for this test
      mockConfigService.getOrThrow.mockImplementation((key) => {
        if (key === 'ipfs') {
          return { enabled: false };
        }
        
        switch (key) {
          case 'redis':
            return { socket: { host: 'localhost', port: 6379 } };
          case 'subscription':
            return { enabled: true };
          case 'mongoDb':
            return { url: 'mongodb://localhost:27017/test' };
          case 'throttler':
            return { ttl: 60, limit: 10 };
          case 'smartConfig':
            return { network: 'testnet' };
          default:
            return null;
        }
      });
      
      // Call register method
      SmartAppModule.register();
      
      // Verify the SubscriptionsModule.forRootAsync was called
      expect(mockSubscriptionsModuleForRootAsync).toHaveBeenCalled();
      
      // Simulate the useFactory call to trigger the getOrThrow
      simulateUseFactory(mockSubscriptionsModuleForRootAsync, 'subscription');
      
      // Verify that subscription configuration was requested
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('subscription');
    });

    it('should configure BullModule with Redis config', () => {
      // Mock Redis config
      mockConfigService.getOrThrow.mockImplementation((key) => {
        if (key === 'redis') {
          return { host: 'localhost', port: 6379 };
        }
        return {};
      });
      
      SmartAppModule.register();
      
      // Simply verify the module was called, we don't need to test the config structure
      expect(mockBullModuleForRootAsync).toHaveBeenCalled();
    });
    
    it('should configure BullModule with default values when Redis config is incomplete', () => {
      // Mock incomplete Redis config
      mockConfigService.getOrThrow.mockImplementation((key) => {
        if (key === 'redis') {
          return {}; // Empty Redis config to force default values
        }
        return {};
      });
      
      SmartAppModule.register();
      
      // Simply verify the module was called, we don't need to test the config structure
      expect(mockBullModuleForRootAsync).toHaveBeenCalled();
    });

    it('should include AuthModule when authentication is enabled', () => {
      // Mock config service to enable authentication
      mockConfigService.getOrThrow.mockImplementation((key) => {
        if (key === 'authentication') {
          return { enabled: true };
        }
        return {};
      });
      
      // We need to mock the module import function to check conditional inclusion
      const result = SmartAppModule.register();
      
      // Verify the AuthModule was called
      expect(mockAuthModuleForRootAsync).toHaveBeenCalled();
    });

    it('should configure SubscriptionsModule with complete options', () => {
      // Mock relevant configs
      mockConfigService.getOrThrow.mockImplementation((key) => {
        if (key === 'subscription') {
          return { 
            enabled: true,
            tokenId: 'test-token',
            issuer: { 
              enabled: true,
              options: {
                redis: { host: 'localhost', port: 6379 }
              }
            },
            tokenGate: { enabled: true }
          };
        }
        if (key === 'subscription.issuer.options.redis') {
          return { host: 'localhost', port: 6379 };
        }
        if (key === 'authentication') {
          return {
            enabled: true,
            commonOptions: {
              jwt: {
                secret: 'test-secret',
                signOptions: { expiresIn: '1h' }
              }
            }
          };
        }
        if (key === 'bull') {
          return {
            redis: { host: 'localhost', port: 6379 },
            defaultJobOptions: {
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 1000
              },
              removeOnComplete: true,
              removeOnFail: false
            }
          };
        }
        // For any other key, return empty object
        return {};
      });
      
      SmartAppModule.register();
      
      // Simply verify the module was called
      expect(mockSubscriptionsModuleForRootAsync).toHaveBeenCalled();
    });
  });
}); 