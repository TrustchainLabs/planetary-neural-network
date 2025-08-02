import { CommandFactory } from 'nest-commander';
import { SmartAppModule } from './smart-app.module';

// Mock the CommandFactory
jest.mock('nest-commander', () => ({
  CommandFactory: {
    run: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Commander', () => {
  let bootstrapFn;

  // Store original process.exit
  const originalProcessExit = process.exit;
  
  beforeAll(() => {
    // Prevent process.exit from actually exiting during tests
    process.exit = jest.fn() as any;
  });
  
  afterAll(() => {
    // Restore original process.exit
    process.exit = originalProcessExit;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // We need to re-import the module to test the bootstrap function
    jest.isolateModules(() => {
      const commanderModule = require('./commander');
      bootstrapFn = commanderModule.bootstrap;
    });
  });

  describe('bootstrap', () => {
    it('should call CommandFactory.run with SmartAppModule and log levels', async () => {
      // Execute the bootstrap function
      if (bootstrapFn) {
        await bootstrapFn();
      }
      
      // Verify CommandFactory.run was called
      expect(CommandFactory.run).toHaveBeenCalled();
      
      // Get the arguments from the call
      const args = (CommandFactory.run as jest.Mock).mock.calls[0];
      
      // Check the first argument has the same name as SmartAppModule
      expect(args[0].name).toBe(SmartAppModule.name);
      
      // Check the second argument is the array of log levels
      expect(args[1]).toEqual(['verbose', 'debug', 'warn', 'error']);
    });
  });
}); 