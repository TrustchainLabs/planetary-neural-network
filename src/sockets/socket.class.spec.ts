import { Web3Socket } from './socket.class';
import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

// Create EventEmitter instance outside the mock
const mockEmitter = new EventEmitter();

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    // Socket.io methods
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event, callback) => {
      mockEmitter.on(event, callback);
      return mockSocket;
    }),
    off: jest.fn((event, callback) => {
      mockEmitter.off(event, callback);
      return mockSocket;
    }),
    // EventEmitter methods for our tests
    emitEvent: (event, ...args) => mockEmitter.emit(event, ...args)
  };
  
  return {
    io: jest.fn().mockReturnValue(mockSocket)
  };
});

describe('Web3Socket', () => {
  let web3Socket: Web3Socket;
  let mockSocket: ReturnType<typeof io>;
  
  const testUrl = 'http://test-server:1234';
  const testNamespace = 'test_namespace';
  const testToken = 'test-auth-token';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create new Web3Socket instance
    web3Socket = new Web3Socket(testUrl, testNamespace, testToken);
    
    // Get the mock socket instance
    mockSocket = io();
  });
  
  it('should be defined', () => {
    expect(web3Socket).toBeDefined();
  });
  
  it('should connect to the socket with the correct URL and namespace', () => {
    // Verify io was called with the correct URL and options
    expect(io).toHaveBeenCalledWith(`ws://${testUrl.replace('http://', '')}/${testNamespace}`, {
      upgrade: false,
      transports: ['websocket'],
      auth: {
        accessToken: testToken
      }
    });
  });
  
  it('should get the socket instance with getSocket', () => {
    // Call getSocket method
    const socket = web3Socket.getSocket();
    
    // Verify the returned socket matches the mock socket
    expect(socket).toBe(mockSocket);
  });
  
  it('should setup connect event handler', () => {
    // Simulate connect event
    (mockSocket as any).emitEvent('connect');
    
    // Verify socket.on was called for 'connect' event
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
  });
  
  it('should setup disconnect event handler', () => {
    // Simulate disconnect event
    (mockSocket as any).emitEvent('disconnect');
    
    // Verify socket.on was called for 'disconnect' event
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });
}); 