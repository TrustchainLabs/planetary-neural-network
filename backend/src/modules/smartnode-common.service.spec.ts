/**
 * @module SmartNodeCommonServiceSpec
 * @description Unit tests for SmartNodeCommonService
 * 
 * This module contains comprehensive unit tests for the SmartNodeCommonService,
 * ensuring that all common SmartNode operations work correctly and handle
 * errors appropriately.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { SmartNodeCommonService } from './smartnode-common.service';
import { SmartNodeSdkService } from '@hsuite/smartnode-sdk';
import { SmartConfigService } from '@hsuite/smart-config';
import { SmartLedgersService } from '@hsuite/smart-ledgers';
import { Client, PrivateKey, Transaction } from '@hashgraph/sdk';
import { IHashgraph } from '@hsuite/hashgraph-types';

describe('SmartNodeCommonService', () => {
  let service: SmartNodeCommonService;
  let smartNodeSdkService: SmartNodeSdkService;
  let smartConfigService: SmartConfigService;
  let smartLedgersService: SmartLedgersService;

  // Mock data
  const mockOperator: IHashgraph.IOperator = {
    accountId: '0.0.123456',
    privateKey: 'mockPrivateKey',
  };

  const mockClient = {
    execute: jest.fn(),
  } as any;

  const mockLedger = {
    getClient: jest.fn().mockResolvedValue(mockClient),
  } as any;

  const mockAdapter = {
    getLedger: jest.fn().mockReturnValue(mockLedger),
  } as any;

  beforeEach(async () => {
    // Create mock implementations
    const mockSmartNodeSdkService = {
      sdk: {
        smartNode: {
          validators: {
            addConsensusValidator: jest.fn().mockResolvedValue('mockConsensusTimestamp'),
          },
        },
        hashgraph: {
          hcs: {
            createTopic: jest.fn().mockResolvedValue(Buffer.from('mockTopicBytes')),
            submitMessage: jest.fn().mockResolvedValue(Buffer.from('mockMessageBytes')),
          },
        },
      },
    };

    const mockSmartConfigService = {
      getOperator: jest.fn().mockReturnValue(mockOperator),
      getChain: jest.fn().mockReturnValue('testnet'),
    };

    const mockSmartLedgersService = {
      getAdapter: jest.fn().mockReturnValue(mockAdapter),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartNodeCommonService,
        { provide: SmartNodeSdkService, useValue: mockSmartNodeSdkService },
        { provide: SmartConfigService, useValue: mockSmartConfigService },
        { provide: SmartLedgersService, useValue: mockSmartLedgersService },
      ],
    }).compile();

    service = module.get<SmartNodeCommonService>(SmartNodeCommonService);
    smartNodeSdkService = module.get<SmartNodeSdkService>(SmartNodeSdkService);
    smartConfigService = module.get<SmartConfigService>(SmartConfigService);
    smartLedgersService = module.get<SmartLedgersService>(SmartLedgersService);

    // Initialize the service
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with correct operator', () => {
    expect(service.getOperator()).toEqual(mockOperator);
  });

  it('should initialize with correct chain', () => {
    expect(service.getChain()).toBe('testnet');
  });

  describe('createTopicWithValidator', () => {
    it('should create a topic with validator successfully', async () => {
      const mockValidator = { name: 'test-validator' };
      const mockTxResponse = {
        transactionId: { toString: () => 'mockTransactionId' },
        getReceipt: jest.fn().mockResolvedValue({ topicId: { toString: () => 'mockTopicId' } }),
        getRecord: jest.fn().mockResolvedValue({ consensusTimestamp: { toString: () => 'mockConsensusTimestamp' } }),
      };

      // Mock the transaction execution
      const mockSignedTx = {
        execute: jest.fn().mockResolvedValue(mockTxResponse),
      };

      const mockTransaction = {
        sign: jest.fn().mockResolvedValue(mockSignedTx),
      };

      // Mock Transaction.fromBytes
      jest.spyOn(Transaction, 'fromBytes').mockReturnValue(mockTransaction as any);
      jest.spyOn(PrivateKey, 'fromString').mockReturnValue({ sign: jest.fn() } as any);

      const result = await service.createTopicWithValidator(mockValidator);

      expect(result).toEqual({
        topicId: 'mockTopicId',
        transactionId: 'mockTransactionId',
        consensusTimestamp: 'mockConsensusTimestamp',
      });
    });

    it('should throw error when topic creation fails', async () => {
      const mockValidator = { name: 'test-validator' };
      
      jest.spyOn(smartNodeSdkService.sdk.smartNode.validators, 'addConsensusValidator')
        .mockRejectedValue(new Error('Validator creation failed'));

      await expect(service.createTopicWithValidator(mockValidator))
        .rejects.toThrow('Failed to create topic with validator: Validator creation failed');
    });
  });

  describe('submitMessageToTopic', () => {
    it('should submit message to topic successfully', async () => {
      const topicId = 'mockTopicId';
      const message = { content: 'test message' };
      const mockTxResponse = {
        transactionId: { toString: () => 'mockTransactionId' },
        getRecord: jest.fn().mockResolvedValue({ consensusTimestamp: { toString: () => 'mockConsensusTimestamp' } }),
      };

      const mockSignedTx = {
        execute: jest.fn().mockResolvedValue(mockTxResponse),
      };

      const mockTransaction = {
        sign: jest.fn().mockResolvedValue(mockSignedTx),
      };

      jest.spyOn(Transaction, 'fromBytes').mockReturnValue(mockTransaction as any);
      jest.spyOn(PrivateKey, 'fromString').mockReturnValue({ sign: jest.fn() } as any);

      const result = await service.submitMessageToTopic(topicId, message);

      expect(result).toEqual({
        transactionId: 'mockTransactionId',
        consensusTimestamp: 'mockConsensusTimestamp',
      });
    });

    it('should throw error when message submission fails', async () => {
      const topicId = 'mockTopicId';
      const message = { content: 'test message' };
      
      jest.spyOn(smartNodeSdkService.sdk.hashgraph.hcs, 'submitMessage')
        .mockRejectedValue(new Error('Message submission failed'));

      await expect(service.submitMessageToTopic(topicId, message))
        .rejects.toThrow('Failed to submit message to topic: Message submission failed');
    });
  });

  describe('createValidator', () => {
    it('should create validator successfully', async () => {
      const mockValidator = { name: 'test-validator' };

      const result = await service.createValidator(mockValidator);

      expect(result).toEqual({
        consensusTimestamp: 'mockConsensusTimestamp',
        validatorData: mockValidator,
      });
    });

    it('should throw error when validator creation fails', async () => {
      const mockValidator = { name: 'test-validator' };
      
      jest.spyOn(smartNodeSdkService.sdk.smartNode.validators, 'addConsensusValidator')
        .mockRejectedValue(new Error('Validator creation failed'));

      await expect(service.createValidator(mockValidator))
        .rejects.toThrow('Failed to create validator: Validator creation failed');
    });
  });

  describe('signAndExecuteTransaction', () => {
    it('should sign and execute transaction successfully', async () => {
      const mockTransaction = {
        sign: jest.fn().mockResolvedValue({
          execute: jest.fn().mockResolvedValue({
            transactionId: { toString: () => 'mockTransactionId' },
            getRecord: jest.fn().mockResolvedValue({ consensusTimestamp: { toString: () => 'mockConsensusTimestamp' } }),
          }),
        }),
      } as any;

      jest.spyOn(PrivateKey, 'fromString').mockReturnValue({ sign: jest.fn() } as any);

      const result = await service.signAndExecuteTransaction(mockTransaction);

      expect(result).toEqual({
        transactionId: 'mockTransactionId',
        consensusTimestamp: 'mockConsensusTimestamp',
      });
    });

    it('should throw error when transaction execution fails', async () => {
      const mockTransaction = {
        sign: jest.fn().mockRejectedValue(new Error('Transaction execution failed')),
      } as any;

      jest.spyOn(PrivateKey, 'fromString').mockReturnValue({ sign: jest.fn() } as any);

      await expect(service.signAndExecuteTransaction(mockTransaction))
        .rejects.toThrow('Failed to execute transaction: Transaction execution failed');
    });
  });
}); 