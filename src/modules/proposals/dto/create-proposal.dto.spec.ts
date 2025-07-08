/**
 * @file create-proposal.dto.spec.ts
 * @description Test suite for the Proposal creation DTO
 * 
 * This file contains comprehensive tests for the proposal creation DTO, including
 * validation rules, constraints, and transformation logic.
 */
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateProposalDto } from './create-proposal.dto';

describe('CreateProposalDto', () => {
  /**
   * Test valid CreateProposalDto
   */
  describe('Valid proposal creation', () => {
    it('should validate when all required properties are valid', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: 'Test Proposal',
        description: 'A test proposal for unit testing',
        creatorAddress: '0.0.123456',
        votingDurationHours: 72,
        proposalData: { action: 'transfer', amount: 1000, recipient: '0.0.789012' }
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBe(0);
    });
    
    it('should validate with optional votingOptions property', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: 'Test Proposal',
        description: 'A test proposal for unit testing',
        creatorAddress: '0.0.123456',
        votingDurationHours: 72,
        proposalData: { action: 'transfer', amount: 1000, recipient: '0.0.789012' },
        votingOptions: ['YES', 'NO', 'ABSTAIN']
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBe(0);
    });
    
    it('should validate with minimum allowed voting options (1)', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: 'Test Proposal',
        description: 'A test proposal for unit testing',
        creatorAddress: '0.0.123456',
        votingDurationHours: 72,
        proposalData: { action: 'transfer', amount: 1000, recipient: '0.0.789012' },
        votingOptions: ['APPROVE']
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBe(0);
    });
    
    it('should validate with maximum allowed voting options (5)', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: 'Test Proposal',
        description: 'A test proposal for unit testing',
        creatorAddress: '0.0.123456',
        votingDurationHours: 72,
        proposalData: { action: 'transfer', amount: 1000, recipient: '0.0.789012' },
        votingOptions: ['A', 'B', 'C', 'D', 'E']
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBe(0);
    });
  });
  
  /**
   * Test invalid CreateProposalDto
   */
  describe('Invalid proposal creation', () => {
    it('should reject when daoId is missing', async () => {
      // Arrange
      const createProposalData = {
        // daoId missing
        title: 'Test Proposal',
        description: 'A test proposal for unit testing',
        creatorAddress: '0.0.123456',
        votingDurationHours: 72,
        proposalData: { action: 'transfer', amount: 1000 }
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const daoIdError = errors.find(err => err.property === 'daoId');
      expect(daoIdError).toBeDefined();
    });
    
    it('should reject when title is empty', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: '', // Empty title
        description: 'A test proposal for unit testing',
        creatorAddress: '0.0.123456',
        votingDurationHours: 72,
        proposalData: { action: 'transfer', amount: 1000 }
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const titleError = errors.find(err => err.property === 'title');
      expect(titleError).toBeDefined();
    });
    
    it('should reject when description is empty', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: 'Test Proposal',
        description: '', // Empty description
        creatorAddress: '0.0.123456',
        votingDurationHours: 72,
        proposalData: { action: 'transfer', amount: 1000 }
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const descError = errors.find(err => err.property === 'description');
      expect(descError).toBeDefined();
    });
    
    it('should reject when creatorAddress is empty', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: 'Test Proposal',
        description: 'A test proposal for unit testing',
        creatorAddress: '', // Empty creatorAddress
        votingDurationHours: 72,
        proposalData: { action: 'transfer', amount: 1000 }
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const creatorError = errors.find(err => err.property === 'creatorAddress');
      expect(creatorError).toBeDefined();
    });
    
    it('should reject when votingDurationHours is not positive', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: 'Test Proposal',
        description: 'A test proposal for unit testing',
        creatorAddress: '0.0.123456',
        votingDurationHours: 0, // Zero is not positive
        proposalData: { action: 'transfer', amount: 1000 }
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const durationError = errors.find(err => err.property === 'votingDurationHours');
      expect(durationError).toBeDefined();
    });
    
    it('should reject when proposalData is missing', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: 'Test Proposal',
        description: 'A test proposal for unit testing',
        creatorAddress: '0.0.123456',
        votingDurationHours: 72
        // proposalData missing
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const dataError = errors.find(err => err.property === 'proposalData');
      expect(dataError).toBeDefined();
    });
    
    it('should reject when proposalData is not an object', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: 'Test Proposal',
        description: 'A test proposal for unit testing',
        creatorAddress: '0.0.123456',
        votingDurationHours: 72,
        proposalData: 'not an object' as any // Not an object
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const dataError = errors.find(err => err.property === 'proposalData');
      expect(dataError).toBeDefined();
    });
    
    it('should reject when votingOptions has too many items', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: 'Test Proposal',
        description: 'A test proposal for unit testing',
        creatorAddress: '0.0.123456',
        votingDurationHours: 72,
        proposalData: { action: 'transfer', amount: 1000 },
        votingOptions: ['A', 'B', 'C', 'D', 'E', 'F'] // 6 options (maximum is 5)
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const optionsError = errors.find(err => err.property === 'votingOptions');
      expect(optionsError).toBeDefined();
    });
    
    it('should reject when votingOptions has too few items', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: 'Test Proposal',
        description: 'A test proposal for unit testing',
        creatorAddress: '0.0.123456',
        votingDurationHours: 72,
        proposalData: { action: 'transfer', amount: 1000 },
        votingOptions: [] // Empty array (minimum is 1)
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const optionsError = errors.find(err => err.property === 'votingOptions');
      expect(optionsError).toBeDefined();
    });
    
    it('should reject when votingOptions contains non-string values', async () => {
      // Arrange
      const createProposalData = {
        daoId: 'dao-123',
        title: 'Test Proposal',
        description: 'A test proposal for unit testing',
        creatorAddress: '0.0.123456',
        votingDurationHours: 72,
        proposalData: { action: 'transfer', amount: 1000 },
        votingOptions: ['YES', 123, 'NO'] as any // Contains a number
      };
      
      const createProposalDto = plainToClass(CreateProposalDto, createProposalData);
      
      // Act
      const errors = await validate(createProposalDto);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const optionsError = errors.find(err => err.property === 'votingOptions');
      expect(optionsError).toBeDefined();
    });
  });
}); 