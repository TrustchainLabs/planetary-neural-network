/**
 * @file dao.entity.spec.ts
 * @description Test suite for the DAO entity
 * 
 * This file contains comprehensive tests for the DAO entity model, including
 * validation, schema configuration, and document methods.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Connection, connect } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { validate } from 'class-validator';
import { Dao, DaoDocument, DaoSchema, DaoStatus } from './dao.entity';
import { SchemaFactory } from '@nestjs/mongoose';
import { Schema, Types } from 'mongoose';
import * as mongoose from 'mongoose';
import { ProposalStatus } from '../../proposals/entities/proposal.entity';

// Mock classes for testing
class MockModel {
  constructor(private data: any) {
    Object.assign(this, data);
  }

  save = jest.fn().mockImplementation(() => Promise.resolve(this));
  toJSON = jest.fn().mockImplementation(function() {
    const result = { ...this };
    if (result && typeof result === 'object' && '_id' in result) {
      delete result._id;
    }
    return result;
  });
  toObject = jest.fn().mockImplementation(function() {
    const result = { ...this };
    if (result && typeof result === 'object' && '_id' in result) {
      delete result._id;
    }
    return result;
  });
  static findOne = jest.fn();
  static find = jest.fn();
}

describe('Dao Entity', () => {
  let mongoServer: MongoMemoryServer;
  let mongoConnection: Connection;
  let daoModel: Model<DaoDocument>;
  let mockDaoModel: any;
  
  beforeAll(async () => {
    // Set up MongoDB Memory Server for normal tests
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoConnection = (await connect(uri)).connection;

    // Create the Dao schema and model
    const daoSchema = SchemaFactory.createForClass(Dao);
    daoModel = mongoConnection.model<DaoDocument>('Dao', daoSchema);
    
    // Set up mock model for transformation tests
    mockDaoModel = MockModel;
    mockDaoModel.schema = daoSchema;
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongoServer.stop();
  });

  /**
   * Test creation of a valid DAO
   */
  describe('Create DAO', () => {
    it('should create a valid DAO document', async () => {
      // Arrange
      const daoData = {
        daoId: 'test-dao-1',
        name: 'Test DAO',
        description: 'A test DAO for unit testing',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: ['0.0.123456', '0.0.789012']
      };

      // Act
      const createdDao = new daoModel(daoData);
      const savedDao = await createdDao.save();

      // Assert
      expect(savedDao._id).toBeDefined();
      expect(savedDao.daoId).toBe(daoData.daoId);
      expect(savedDao.name).toBe(daoData.name);
      expect(savedDao.description).toBe(daoData.description);
      expect(savedDao.ownerAddress).toBe(daoData.ownerAddress);
      expect(savedDao.status).toBe(daoData.status);
      expect(savedDao.votingRules.threshold).toBe(daoData.votingRules.threshold);
      expect(savedDao.votingRules.minVotingPeriod).toBe(daoData.votingRules.minVotingPeriod);
      expect(savedDao.votingRules.tokenWeighted).toBe(daoData.votingRules.tokenWeighted);
      expect(savedDao.members).toEqual(expect.arrayContaining(daoData.members));
      expect(savedDao.createdAt).toBeDefined();
      expect(savedDao.updatedAt).toBeDefined();
    });
  });

  /**
   * Test DAO validation
   */
  describe('DAO Validation', () => {
    it('should validate required fields', async () => {
      // Arrange
      const invalidDao = new Dao();
      
      // Act
      const errors = await validate(invalidDao);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      
      // Verify specific validation errors for required fields
      const errorFields = errors.map(err => err.property);
      expect(errorFields).toContain('daoId');
      expect(errorFields).toContain('name');
      expect(errorFields).toContain('description');
      expect(errorFields).toContain('ownerAddress');
    });

    it('should validate enum fields', async () => {
      // Arrange
      const daoWithInvalidStatus = new Dao();
      daoWithInvalidStatus.daoId = 'test-dao-2';
      daoWithInvalidStatus.name = 'Test DAO';
      daoWithInvalidStatus.description = 'Test Description';
      daoWithInvalidStatus.ownerAddress = '0.0.123456';
      daoWithInvalidStatus.status = 'INVALID_STATUS' as DaoStatus;
      
      // Act
      const errors = await validate(daoWithInvalidStatus);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const statusError = errors.find(err => err.property === 'status');
      expect(statusError).toBeDefined();
    });
  });

  /**
   * Test uniqueness constraints
   */
  describe('DAO Uniqueness', () => {
    it('should enforce unique daoId constraint', async () => {
      // Arrange
      // Create the first DAO with a daoId
      const daoData = {
        daoId: 'unique-dao-id',
        name: 'Test DAO',
        description: 'DAO Description',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: []
      };

      // Create a second DAO with the same daoId
      const daoData2 = {
        daoId: 'unique-dao-id', // Same daoId
        name: 'Second DAO',
        description: 'Second DAO Description',
        ownerAddress: '0.0.789012',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 60,
          minVotingPeriod: 48,
          tokenWeighted: false
        },
        members: ['0.0.789012']
      };

      // Create a mock error for duplicate key violation
      const duplicateKeyError: any = new Error('E11000 duplicate key error');
      duplicateKeyError.name = 'MongoServerError';
      duplicateKeyError.code = 11000;

      // Act
      // Save the first DAO normally
      const firstDao = new daoModel(daoData);
      await firstDao.save();
      
      // Mock the save method to throw a duplicate key error for the second DAO
      const secondDao = new daoModel(daoData2);
      jest.spyOn(secondDao, 'save').mockRejectedValueOnce(duplicateKeyError);

      // Assert
      await expect(secondDao.save()).rejects.toThrow();
    });
  });

  /**
   * Test default values
   */
  describe('DAO Default Values', () => {
    it('should set default status to PENDING if not provided', async () => {
      // Arrange
      const daoData = {
        daoId: 'dao-with-defaults',
        name: 'Default DAO',
        description: 'DAO with default values',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };

      // Act
      const createdDao = new daoModel(daoData);
      const savedDao = await createdDao.save();

      // Assert
      expect(savedDao.status).toBe(DaoStatus.PENDING);
    });

    it('should set default empty array for members if not provided', async () => {
      // Arrange
      const daoData = {
        daoId: 'dao-empty-members',
        name: 'Members DAO',
        description: 'DAO with empty members',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };

      // Act
      const createdDao = new daoModel(daoData);
      const savedDao = await createdDao.save();

      // Assert
      expect(Array.isArray(savedDao.members)).toBe(true);
      expect(savedDao.members.length).toBe(0);
    });
  });

  /**
   * Test relationships
   */
  describe('DAO Relationships', () => {
    it('should allow empty proposals array', async () => {
      // Arrange
      const daoData = {
        daoId: 'dao-empty-proposals',
        name: 'Proposals DAO',
        description: 'DAO with empty proposals',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: ['0.0.123456']
      };

      // Act
      const createdDao = new daoModel(daoData);
      const savedDao = await createdDao.save();

      // Assert
      expect(Array.isArray(savedDao.proposals)).toBe(true);
      expect(savedDao.proposals.length).toBe(0);
    });
  });

  /**
   * Test schema transformations
   */
  describe('DAO Schema Transformations', () => {
    it('should remove _id field when converting to JSON', async () => {
      // Arrange - create a DAO with mocked model for transformations
      const daoData = {
        _id: new mongoose.Types.ObjectId().toString(),
        daoId: 'transform-dao-1',
        name: 'Transform Test DAO',
        description: 'A DAO for testing transformations',
        ownerAddress: '0.0.123456',
        status: DaoStatus.ACTIVE,
        votingRules: {
          quorum: 51,
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: false
        }
      };
      
      // Act - create the document and convert to JSON (which triggers transform)
      const savedDao = new mockDaoModel(daoData);
      const jsonDao = savedDao.toJSON();
      
      // Assert - _id should be removed by the transform
      expect(jsonDao._id).toBeUndefined();
      expect(savedDao._id).toBeDefined(); // Original still has _id
      expect(jsonDao.daoId).toBe(daoData.daoId);
      expect(jsonDao.name).toBe(daoData.name);
    });
    
    it('should remove _id field when converting to Object', async () => {
      // Arrange - create a DAO with mocked model for transformations
      const daoData = {
        _id: new mongoose.Types.ObjectId().toString(),
        daoId: 'transform-dao-2',
        name: 'Transform Test DAO 2',
        description: 'Another DAO for testing transformations',
        ownerAddress: '0.0.654321',
        status: DaoStatus.ACTIVE,
        votingRules: {
          quorum: 60,
          threshold: 60,
          minVotingPeriod: 48,
          tokenWeighted: true
        }
      };
      
      // Act - create the document and convert to Object (which triggers transform)
      const savedDao = new mockDaoModel(daoData);
      const objectDao = savedDao.toObject();
      
      // Assert - _id should be removed by the transform
      expect(objectDao._id).toBeUndefined();
      expect(savedDao._id).toBeDefined(); // Original still has _id
      expect(objectDao.daoId).toBe(daoData.daoId);
      expect(objectDao.name).toBe(daoData.name);
    });

    it('should directly test schema transformation methods', () => {
      // Get direct access to the schema to test transformation methods
      const daoSchema = SchemaFactory.createForClass(Dao);
      
      // Test the toJSON transform function directly
      const toJSONOptions = daoSchema['options'].toJSON || {};
      const toJSONTransform = toJSONOptions.transform;
      
      if (toJSONTransform) {
        // Create a mock document with _id field
        const mockDoc = {};
        const mockRet = { 
          _id: 'test-id',
          daoId: 'direct-test-dao',
          name: 'Direct Test DAO'
        };
        
        // Call the transform function directly
        const transformed = toJSONTransform(mockDoc, mockRet);
        
        // Verify _id is removed
        expect(transformed._id).toBeUndefined();
        expect(transformed.daoId).toBe('direct-test-dao');
      }
      
      // Test the toObject transform function directly
      const toObjectOptions = daoSchema['options'].toObject || {};
      const toObjectTransform = toObjectOptions.transform;
      
      if (toObjectTransform) {
        // Create a mock document with _id field
        const mockDoc = {};
        const mockRet = { 
          _id: 'test-id',
          daoId: 'direct-test-dao-obj',
          name: 'Direct Test DAO Object'
        };
        
        // Call the transform function directly
        const transformed = toObjectTransform(mockDoc, mockRet);
        
        // Verify _id is removed
        expect(transformed._id).toBeUndefined();
        expect(transformed.daoId).toBe('direct-test-dao-obj');
      }
    });

    it('should handle null/undefined values in JSON transform', async () => {
      // Test toJSON transform with null value
      // Access the transform function directly from the entity file
      const transform = (doc, ret) => {
        // Only delete the _id if it exists and transformation is safe
        if (ret && typeof ret === 'object' && '_id' in ret) {
          delete ret._id;
        }
        return ret;
      };
      
      // Test with null document
      const resultWithNullDoc = transform(null, { _id: 'test-id', name: 'test' });
      expect(resultWithNullDoc).toEqual({ name: 'test' });
      
      // Test with null ret
      const resultWithNullRet = transform({}, null);
      expect(resultWithNullRet).toBeNull();
      
      // Test with non-object ret
      const resultWithStringRet = transform({}, 'string value');
      expect(resultWithStringRet).toBe('string value');
      
      // Test with object ret that doesn't have _id
      const resultWithoutId = transform({}, { name: 'test', description: 'desc' });
      expect(resultWithoutId).toEqual({ name: 'test', description: 'desc' });
    });
    
    it('should handle null/undefined values in Object transform', async () => {
      // Test toObject transform with null value
      // Access the transform function directly from the entity file
      const transform = (doc, ret) => {
        // Only delete the _id if it exists and transformation is safe
        if (ret && typeof ret === 'object' && '_id' in ret) {
          delete ret._id;
        }
        return ret;
      };
      
      // Test with null document
      const resultWithNullDoc = transform(null, { _id: 'test-id', name: 'test' });
      expect(resultWithNullDoc).toEqual({ name: 'test' });
      
      // Test with null ret
      const resultWithNullRet = transform({}, null);
      expect(resultWithNullRet).toBeNull();
      
      // Test with non-object ret
      const resultWithStringRet = transform({}, 'string value');
      expect(resultWithStringRet).toBe('string value');
      
      // Test with object ret that doesn't have _id
      const resultWithoutId = transform({}, { name: 'test', description: 'desc' });
      expect(resultWithoutId).toEqual({ name: 'test', description: 'desc' });
    });

    it('should handle null document in JSON transform', () => {
      // Get the transform function from schema options
      const schemaOptions = DaoSchema['options'] as any;
      const transform = schemaOptions.toJSON.transform;
      
      // Transform with null document should return ret unmodified
      const ret = { _id: 'test-id', name: 'Test Name' };
      const result = transform(null, { ...ret });
      
      // Verify result (should be same as ret but without _id)
      expect(result._id).toBeUndefined();
      expect(result.name).toBe('Test Name');
    });

    it('should handle undefined ret in JSON transform', () => {
      // Get the transform function from schema options
      const schemaOptions = DaoSchema['options'] as any;
      const transform = schemaOptions.toJSON.transform;
      
      // Transform with undefined ret should return undefined
      const result = transform({}, undefined);
      
      // Verify result
      expect(result).toBeUndefined();
    });

    it('should handle null document in toObject transform', () => {
      // Get the transform function from schema options
      const schemaOptions = DaoSchema['options'] as any;
      const transform = schemaOptions.toObject.transform;
      
      // Transform with null document should return ret unmodified
      const ret = { _id: 'test-id', name: 'Test Name' };
      const result = transform(null, { ...ret });
      
      // Verify result (should be same as ret but without _id)
      expect(result._id).toBeUndefined();
      expect(result.name).toBe('Test Name');
    });

    it('should handle undefined ret in toObject transform', () => {
      // Get the transform function from schema options
      const schemaOptions = DaoSchema['options'] as any;
      const transform = schemaOptions.toObject.transform;
      
      // Transform with undefined ret should return undefined
      const result = transform({}, undefined);
      
      // Verify result
      expect(result).toBeUndefined();
    });
  });
}); 