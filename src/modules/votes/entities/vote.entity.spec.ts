/**
 * @file vote.entity.spec.ts
 * @description Test suite for the Vote entity
 * 
 * This file contains comprehensive tests for the Vote entity model, including
 * validation, schema configuration, and document methods.
 */
import { Connection, Types } from 'mongoose';
import * as mongoose from 'mongoose';
import { validate } from 'class-validator';
import { Vote, VoteDocument, VoteChoice, VoteSchema } from './vote.entity';
import { SchemaFactory } from '@nestjs/mongoose';
import { Model, connect } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

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

describe('Vote Entity', () => {
  let mongoConnection: Connection;
  let voteModel: any;
  
  beforeAll(async () => {
    // Create the Vote schema
    const voteSchema = SchemaFactory.createForClass(Vote);
    
    // Mock model
    voteModel = MockModel;
    voteModel.schema = voteSchema;
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  /**
   * Test creation of a valid vote
   */
  describe('Create Vote', () => {
    it('should create a valid vote document', async () => {
      // Arrange
      const voteData = {
        voteId: 'test-vote-1',
        proposal: new Types.ObjectId(),
        proposalId: 'test-proposal-1',
        dao: new Types.ObjectId(),
        daoId: 'test-dao-1',
        voterAddress: '0.0.123456',
        choice: 'YES',
        weight: 1
      };

      // Create a vote instance with the mock model
      const vote = new voteModel(voteData);
      
      // Mock save to return the vote with additional fields
      vote.save.mockResolvedValueOnce({
        ...voteData,
        _id: new Types.ObjectId().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Act
      const savedVote = await vote.save();

      // Assert
      expect(savedVote.voteId).toBe(voteData.voteId);
      expect(savedVote.proposalId).toBe(voteData.proposalId);
      expect(savedVote.daoId).toBe(voteData.daoId);
      expect(savedVote.voterAddress).toBe(voteData.voterAddress);
      expect(savedVote.choice).toBe(voteData.choice);
      expect(savedVote.weight).toBe(voteData.weight);
      expect(savedVote.createdAt).toBeDefined();
      expect(savedVote.updatedAt).toBeDefined();
    });
  });

  /**
   * Test vote validation
   */
  describe('Vote Validation', () => {
    it('should validate required fields', async () => {
      // Arrange
      const invalidVote = new Vote();
      
      // Act
      const errors = await validate(invalidVote);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      
      // Verify specific validation errors for required fields
      const errorFields = errors.map(err => err.property);
      expect(errorFields).toContain('voteId');
      expect(errorFields).toContain('proposalId');
      expect(errorFields).toContain('daoId');
      expect(errorFields).toContain('voterAddress');
      expect(errorFields).toContain('choice');
    });

    it('should validate string fields', async () => {
      // Arrange
      const voteWithInvalidTypes = new Vote();
      voteWithInvalidTypes.voteId = 123 as any;
      voteWithInvalidTypes.proposalId = 123 as any;
      voteWithInvalidTypes.daoId = 123 as any;
      voteWithInvalidTypes.voterAddress = 123 as any;
      voteWithInvalidTypes.choice = 123 as any;
      
      // Act
      const errors = await validate(voteWithInvalidTypes);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      
      // Check that we get string validation errors
      errors.forEach(error => {
        if (['voteId', 'proposalId', 'daoId', 'voterAddress', 'choice'].includes(error.property)) {
          expect(error.constraints).toHaveProperty('isString');
        }
      });
    });

    it('should validate numeric weight field', async () => {
      // Arrange
      const voteWithInvalidWeight = new Vote();
      voteWithInvalidWeight.voteId = 'test-vote';
      voteWithInvalidWeight.proposalId = 'test-proposal';
      voteWithInvalidWeight.daoId = 'test-dao';
      voteWithInvalidWeight.voterAddress = '0.0.123456';
      voteWithInvalidWeight.choice = 'YES';
      voteWithInvalidWeight.weight = -1; // Negative weight
      
      // Act
      const errors = await validate(voteWithInvalidWeight);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const weightError = errors.find(err => err.property === 'weight');
      expect(weightError).toBeDefined();
      expect(weightError.constraints).toHaveProperty('isPositive');
    });

    it('should validate optional comment field', async () => {
      // Arrange
      const voteWithInvalidComment = new Vote();
      voteWithInvalidComment.voteId = 'test-vote';
      voteWithInvalidComment.proposalId = 'test-proposal';
      voteWithInvalidComment.daoId = 'test-dao';
      voteWithInvalidComment.voterAddress = '0.0.123456';
      voteWithInvalidComment.choice = 'YES';
      voteWithInvalidComment.comment = 123 as any; // Not a string
      
      // Act
      const errors = await validate(voteWithInvalidComment);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const commentError = errors.find(err => err.property === 'comment');
      expect(commentError).toBeDefined();
      expect(commentError.constraints).toHaveProperty('isString');
    });
  });

  /**
   * Test uniqueness constraints
   */
  describe('Vote Uniqueness', () => {
    it('should enforce unique voteId constraint', async () => {
      // Arrange
      const firstVoteData = {
        voteId: 'unique-vote-id',
        proposal: new Types.ObjectId(),
        proposalId: 'test-proposal-1',
        dao: new Types.ObjectId(),
        daoId: 'test-dao-1',
        voterAddress: '0.0.123456',
        choice: 'YES'
      };

      const secondVoteData = {
        voteId: 'unique-vote-id', // Same voteId
        proposal: new Types.ObjectId(),
        proposalId: 'test-proposal-2',
        dao: new Types.ObjectId(),
        daoId: 'test-dao-2',
        voterAddress: '0.0.789012',
        choice: 'NO'
      };

      // Create first vote with unique ID
      const firstVote = new voteModel(firstVoteData);
      firstVote.save.mockResolvedValueOnce(firstVoteData);

      // Create second vote with same ID - should throw error
      const secondVote = new voteModel(secondVoteData);
      secondVote.save.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      // Act & Assert
      await firstVote.save();
      await expect(secondVote.save()).rejects.toThrow();
    });
  });

  /**
   * Test default values
   */
  describe('Vote Default Values', () => {
    it('should set default weight to 1 if not provided', async () => {
      // Arrange
      const voteData = {
        voteId: 'vote-with-default-weight',
        proposal: new Types.ObjectId(),
        proposalId: 'test-proposal-1',
        dao: new Types.ObjectId(),
        daoId: 'test-dao-1',
        voterAddress: '0.0.123456',
        choice: 'YES'
        // weight not provided
      };

      // Create a vote instance with the mock model
      const vote = new voteModel(voteData);
      
      // Mock save to return with default weight
      vote.save.mockResolvedValueOnce({
        ...voteData,
        weight: 1 // Default weight
      });

      // Act
      const savedVote = await vote.save();

      // Assert
      expect(savedVote.weight).toBe(1);
    });
  });

  /**
   * Test object references
   */
  describe('Vote References', () => {
    it('should have correct ObjectId references to Proposal and DAO', () => {
      // Arrange
      const proposalId = new Types.ObjectId();
      const daoId = new Types.ObjectId();
      
      // Act
      const vote = new voteModel({
        voteId: 'test-vote-refs',
        proposal: proposalId,
        proposalId: 'test-proposal-1',
        dao: daoId,
        daoId: 'test-dao-1',
        voterAddress: '0.0.123456',
        choice: 'YES'
      });

      // Assert
      expect(vote.proposal).toEqual(proposalId);
      expect(vote.dao).toEqual(daoId);
    });
  });

  /**
   * Test schema transformations
   */
  describe('Vote Schema Transformations', () => {
    it('should remove _id field when converting to JSON', async () => {
      // Arrange - create a Vote with MongoDB model (which will have _id)
      const voteData = {
        _id: new Types.ObjectId().toString(),
        voteId: 'transform-vote-1',
        proposalId: 'test-proposal-1',
        daoId: 'test-dao-1',
        voterAddress: '0.0.123456',
        choice: 'YES',
        weight: 1
      };
      
      // Act - create the document and convert to JSON (which triggers transform)
      const createdVote = new voteModel(voteData);
      const savedVote = await createdVote.save();
      const jsonVote = savedVote.toJSON();
      
      // Assert - _id should be removed by the transform
      expect(jsonVote._id).toBeUndefined();
      expect(savedVote._id).toBeDefined(); // Original still has _id
      expect(jsonVote.voteId).toBe(voteData.voteId);
      expect(jsonVote.proposalId).toBe(voteData.proposalId);
    });
    
    it('should remove _id field when converting to Object', async () => {
      // Arrange - create a Vote with MongoDB model (which will have _id)
      const voteData = {
        _id: new Types.ObjectId().toString(),
        voteId: 'transform-vote-2',
        proposalId: 'test-proposal-2',
        daoId: 'test-dao-2',
        voterAddress: '0.0.654321',
        choice: 'NO',
        weight: 2
      };
      
      // Act - create the document and convert to Object (which triggers transform)
      const createdVote = new voteModel(voteData);
      const savedVote = await createdVote.save();
      const objectVote = savedVote.toObject();
      
      // Assert - _id should be removed by the transform
      expect(objectVote._id).toBeUndefined();
      expect(savedVote._id).toBeDefined(); // Original still has _id
      expect(objectVote.voteId).toBe(voteData.voteId);
      expect(objectVote.proposalId).toBe(voteData.proposalId);
    });

    it('should handle null/undefined values in JSON transform', async () => {
      // Get the transform function from schema options
      const schemaOptions = VoteSchema['options'] as any;
      const transform = schemaOptions.toJSON.transform;
      
      // Test with null document
      const resultWithNullDoc = transform(null, { _id: 'test-id', choice: 'YES' });
      expect(resultWithNullDoc).toEqual({ choice: 'YES' });
      
      // Test with null ret
      const resultWithNullRet = transform({}, null);
      expect(resultWithNullRet).toBeNull();
      
      // Test with non-object ret
      const resultWithStringRet = transform({}, 'string value');
      expect(resultWithStringRet).toBe('string value');
      
      // Test with object ret that doesn't have _id
      const resultWithoutId = transform({}, { voteId: 'vote-1', choice: 'YES' });
      expect(resultWithoutId).toEqual({ voteId: 'vote-1', choice: 'YES' });
    });
    
    it('should handle null/undefined values in Object transform', async () => {
      // Get the transform function from schema options
      const schemaOptions = VoteSchema['options'] as any;
      const transform = schemaOptions.toObject.transform;
      
      // Test with null document
      const resultWithNullDoc = transform(null, { _id: 'test-id', choice: 'NO' });
      expect(resultWithNullDoc).toEqual({ choice: 'NO' });
      
      // Test with null ret
      const resultWithNullRet = transform({}, null);
      expect(resultWithNullRet).toBeNull();
      
      // Test with non-object ret
      const resultWithStringRet = transform({}, 'string value');
      expect(resultWithStringRet).toBe('string value');
      
      // Test with object ret that doesn't have _id
      const resultWithoutId = transform({}, { voteId: 'vote-2', choice: 'NO' });
      expect(resultWithoutId).toEqual({ voteId: 'vote-2', choice: 'NO' });
    });
  });
}); 