/**
 * @file create-dao.dto.spec.ts
 * @description Test suite for the DAO creation DTOs
 * 
 * This file contains comprehensive tests for the DAO creation DTOs, including
 * validation rules, constraints, and transformation logic.
 */
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateDaoDto, VotingRulesDto } from './create-dao.dto';

describe('VotingRulesDto', () => {
  /**
   * Test valid VotingRulesDto
   */
  describe('Valid voting rules', () => {
    it('should validate when all properties are valid', async () => {
      // Arrange
      const votingRulesData = {
        threshold: 51,
        minVotingPeriod: 72,
        tokenWeighted: true
      };
      
      const votingRules = plainToClass(VotingRulesDto, votingRulesData);
      
      // Act
      const errors = await validate(votingRules);
      
      // Assert
      expect(errors.length).toBe(0);
    });
    
    it('should accept threshold at minimum value (1)', async () => {
      // Arrange
      const votingRulesData = {
        threshold: 1,
        minVotingPeriod: 24,
        tokenWeighted: false
      };
      
      const votingRules = plainToClass(VotingRulesDto, votingRulesData);
      
      // Act
      const errors = await validate(votingRules);
      
      // Assert
      expect(errors.length).toBe(0);
    });
    
    it('should accept threshold at maximum value (100)', async () => {
      // Arrange
      const votingRulesData = {
        threshold: 100,
        minVotingPeriod: 24,
        tokenWeighted: false
      };
      
      const votingRules = plainToClass(VotingRulesDto, votingRulesData);
      
      // Act
      const errors = await validate(votingRules);
      
      // Assert
      expect(errors.length).toBe(0);
    });
  });
  
  /**
   * Test invalid VotingRulesDto
   */
  describe('Invalid voting rules', () => {
    it('should reject threshold below minimum value (1)', async () => {
      // Arrange
      const votingRulesData = {
        threshold: 0,
        minVotingPeriod: 24,
        tokenWeighted: false
      };
      
      const votingRules = plainToClass(VotingRulesDto, votingRulesData);
      
      // Act
      const errors = await validate(votingRules);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const thresholdError = errors.find(err => err.property === 'threshold');
      expect(thresholdError).toBeDefined();
    });
    
    it('should reject threshold above maximum value (100)', async () => {
      // Arrange
      const votingRulesData = {
        threshold: 101,
        minVotingPeriod: 24,
        tokenWeighted: false
      };
      
      const votingRules = plainToClass(VotingRulesDto, votingRulesData);
      
      // Act
      const errors = await validate(votingRules);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const thresholdError = errors.find(err => err.property === 'threshold');
      expect(thresholdError).toBeDefined();
    });
    
    it('should reject negative minVotingPeriod', async () => {
      // Arrange
      const votingRulesData = {
        threshold: 51,
        minVotingPeriod: -1,
        tokenWeighted: true
      };
      
      const votingRules = plainToClass(VotingRulesDto, votingRulesData);
      
      // Act
      const errors = await validate(votingRules);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const periodError = errors.find(err => err.property === 'minVotingPeriod');
      expect(periodError).toBeDefined();
    });
    
    it('should reject zero minVotingPeriod', async () => {
      // Arrange
      const votingRulesData = {
        threshold: 51,
        minVotingPeriod: 0,
        tokenWeighted: true
      };
      
      const votingRules = plainToClass(VotingRulesDto, votingRulesData);
      
      // Act
      const errors = await validate(votingRules);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const periodError = errors.find(err => err.property === 'minVotingPeriod');
      expect(periodError).toBeDefined();
    });
    
    it('should reject when threshold is not a number', async () => {
      // Arrange
      const votingRulesData = {
        threshold: 'invalid' as any,
        minVotingPeriod: 24,
        tokenWeighted: false
      };
      
      const votingRules = plainToClass(VotingRulesDto, votingRulesData);
      
      // Act
      const errors = await validate(votingRules);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const thresholdError = errors.find(err => err.property === 'threshold');
      expect(thresholdError).toBeDefined();
    });
    
    it('should reject when tokenWeighted is not a boolean', async () => {
      // Arrange
      const votingRulesData = {
        threshold: 51,
        minVotingPeriod: 24,
        tokenWeighted: 'yes' as any
      };
      
      const votingRules = plainToClass(VotingRulesDto, votingRulesData);
      
      // Act
      const errors = await validate(votingRules);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const weightedError = errors.find(err => err.property === 'tokenWeighted');
      expect(weightedError).toBeDefined();
    });
  });
});

describe('CreateDaoDto', () => {
  /**
   * Test valid CreateDaoDto
   */
  describe('Valid DAO creation', () => {
    it('should validate when all required properties are valid', async () => {
      // Arrange
      const createDaoData = {
        name: 'Test DAO',
        description: 'A test DAO for unit testing',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };
      
      const createDao = plainToClass(CreateDaoDto, createDaoData);
      
      // Act
      const errors = await validate(createDao);
      
      // Assert
      expect(errors.length).toBe(0);
    });
    
    it('should validate with optional members property', async () => {
      // Arrange
      const createDaoData = {
        name: 'Test DAO',
        description: 'A test DAO for unit testing',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: ['0.0.123456', '0.0.789012']
      };
      
      const createDao = plainToClass(CreateDaoDto, createDaoData);
      
      // Act
      const errors = await validate(createDao);
      
      // Assert
      expect(errors.length).toBe(0);
    });
    
    it('should validate with empty members array', async () => {
      // Arrange
      const createDaoData = {
        name: 'Test DAO',
        description: 'A test DAO for unit testing',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: []
      };
      
      const createDao = plainToClass(CreateDaoDto, createDaoData);
      
      // Act
      const errors = await validate(createDao);
      
      // Assert
      expect(errors.length).toBe(0);
    });
  });
  
  /**
   * Test invalid CreateDaoDto
   */
  describe('Invalid DAO creation', () => {
    it('should reject when name is empty', async () => {
      // Arrange
      const createDaoData = {
        name: '', // Empty name
        description: 'A test DAO for unit testing',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };
      
      const createDao = plainToClass(CreateDaoDto, createDaoData);
      
      // Act
      const errors = await validate(createDao);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const nameError = errors.find(err => err.property === 'name');
      expect(nameError).toBeDefined();
    });
    
    it('should reject when description is empty', async () => {
      // Arrange
      const createDaoData = {
        name: 'Test DAO',
        description: '', // Empty description
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };
      
      const createDao = plainToClass(CreateDaoDto, createDaoData);
      
      // Act
      const errors = await validate(createDao);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const descError = errors.find(err => err.property === 'description');
      expect(descError).toBeDefined();
    });
    
    it('should reject when ownerAddress is empty', async () => {
      // Arrange
      const createDaoData = {
        name: 'Test DAO',
        description: 'A test DAO for unit testing',
        ownerAddress: '', // Empty owner address
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };
      
      const createDao = plainToClass(CreateDaoDto, createDaoData);
      
      // Act
      const errors = await validate(createDao);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const ownerError = errors.find(err => err.property === 'ownerAddress');
      expect(ownerError).toBeDefined();
    });
    
    it('should reject when votingRules is missing', async () => {
      // Arrange
      const createDaoData = {
        name: 'Test DAO',
        description: 'A test DAO for unit testing',
        ownerAddress: '0.0.123456'
        // Missing votingRules
      };
      
      const createDao = plainToClass(CreateDaoDto, createDaoData);
      
      // Act
      const errors = await validate(createDao);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const rulesError = errors.find(err => err.property === 'votingRules');
      expect(rulesError).toBeDefined();
    });
    
    it('should reject when votingRules has invalid properties', async () => {
      // Arrange
      const createDaoData = {
        name: 'Test DAO',
        description: 'A test DAO for unit testing',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 0, // Invalid threshold
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };
      
      const createDao = plainToClass(CreateDaoDto, createDaoData);
      
      // Act
      const errors = await validate(createDao, { validationError: { target: false } });
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const rulesError = errors.find(err => err.property === 'votingRules');
      expect(rulesError).toBeDefined();
    });
    
    it('should reject when members contains non-string values', async () => {
      // Arrange
      const createDaoData = {
        name: 'Test DAO',
        description: 'A test DAO for unit testing',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        },
        members: ['0.0.123456', 123 as any] // Non-string member
      };
      
      const createDao = plainToClass(CreateDaoDto, createDaoData);
      
      // Act
      const errors = await validate(createDao);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const membersError = errors.find(err => err.property === 'members');
      expect(membersError).toBeDefined();
    });
  });
  
  /**
   * Test transformation
   */
  describe('Transformation', () => {
    it('should properly transform nested votingRules object', async () => {
      // Arrange
      const createDaoData = {
        name: 'Test DAO',
        description: 'A test DAO for unit testing',
        ownerAddress: '0.0.123456',
        votingRules: {
          threshold: 51,
          minVotingPeriod: 24,
          tokenWeighted: true
        }
      };
      
      // Act
      const createDao = plainToClass(CreateDaoDto, createDaoData);
      
      // Assert
      expect(createDao.votingRules).toBeInstanceOf(VotingRulesDto);
      expect(createDao.votingRules.threshold).toBe(51);
      expect(createDao.votingRules.minVotingPeriod).toBe(24);
      expect(createDao.votingRules.tokenWeighted).toBe(true);
    });
  });
}); 