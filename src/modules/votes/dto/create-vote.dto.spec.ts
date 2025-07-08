/**
 * @file create-vote.dto.spec.ts
 * @description Test suite for the CreateVoteDto
 * 
 * This file contains comprehensive tests for the CreateVoteDto validation rules
 * and constraints to ensure proper validation of vote creation input.
 */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateVoteDto } from './create-vote.dto';

describe('CreateVoteDto', () => {
  /**
   * Test valid DTO instances
   */
  describe('Validation - Valid Inputs', () => {
    it('should validate a complete vote DTO with all required fields', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        daoId: 'dao-456',
        voterAddress: '0.0.123456',
        choice: 'YES'
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should validate a vote DTO with optional comment', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        daoId: 'dao-456',
        voterAddress: '0.0.123456',
        choice: 'YES',
        comment: 'I support this proposal because...'
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBe(0);
    });
  });

  /**
   * Test invalid DTO instances - Missing required fields
   */
  describe('Validation - Missing Required Fields', () => {
    it('should not validate a vote DTO with missing proposalId', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        daoId: 'dao-456',
        voterAddress: '0.0.123456',
        choice: 'YES'
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('proposalId');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should not validate a vote DTO with missing daoId', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        voterAddress: '0.0.123456',
        choice: 'YES'
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('daoId');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should not validate a vote DTO with missing voterAddress', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        daoId: 'dao-456',
        choice: 'YES'
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('voterAddress');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should not validate a vote DTO with missing choice', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        daoId: 'dao-456',
        voterAddress: '0.0.123456'
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('choice');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  /**
   * Test invalid DTO instances - Type validation
   */
  describe('Validation - Type Checks', () => {
    it('should not validate a vote DTO with non-string proposalId', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 123, // should be string
        daoId: 'dao-456',
        voterAddress: '0.0.123456',
        choice: 'YES'
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('proposalId');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should not validate a vote DTO with non-string daoId', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        daoId: 123, // should be string
        voterAddress: '0.0.123456',
        choice: 'YES'
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('daoId');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should not validate a vote DTO with non-string voterAddress', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        daoId: 'dao-456',
        voterAddress: 123456, // should be string
        choice: 'YES'
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('voterAddress');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should not validate a vote DTO with non-string choice', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        daoId: 'dao-456',
        voterAddress: '0.0.123456',
        choice: 123 // should be string
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('choice');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should not validate a vote DTO with non-string comment', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        daoId: 'dao-456',
        voterAddress: '0.0.123456',
        choice: 'YES',
        comment: 123 // should be string
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('comment');
      expect(errors[0].constraints).toHaveProperty('isString');
    });
  });

  /**
   * Test invalid DTO instances - Empty string validation
   */
  describe('Validation - Empty String Checks', () => {
    it('should not validate a vote DTO with empty proposalId', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: '',
        daoId: 'dao-456',
        voterAddress: '0.0.123456',
        choice: 'YES'
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('proposalId');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should not validate a vote DTO with empty daoId', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        daoId: '',
        voterAddress: '0.0.123456',
        choice: 'YES'
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('daoId');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should not validate a vote DTO with empty voterAddress', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        daoId: 'dao-456',
        voterAddress: '',
        choice: 'YES'
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('voterAddress');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should not validate a vote DTO with empty choice', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        daoId: 'dao-456',
        voterAddress: '0.0.123456',
        choice: ''
      });

      // Act
      const errors = await validate(voteDto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('choice');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should validate a vote DTO with empty comment (since it\'s optional)', async () => {
      // Arrange
      const voteDto = plainToInstance(CreateVoteDto, {
        proposalId: 'prop-123',
        daoId: 'dao-456',
        voterAddress: '0.0.123456',
        choice: 'YES',
        comment: ''
      });

      // Act
      const errors = await validate(voteDto);

      // Assert - there should be no errors since comment is optional
      expect(errors.length).toBe(0);
    });
  });

  /**
   * Test transformations
   */
  describe('Transformation', () => {
    it('should transform input data into a CreateVoteDto instance', () => {
      // Arrange
      const rawData = {
        proposalId: 'prop-123',
        daoId: 'dao-456',
        voterAddress: '0.0.123456',
        choice: 'YES',
        comment: 'My supporting comment'
      };
      
      // Act
      const voteDto = plainToInstance(CreateVoteDto, rawData);
      
      // Assert
      expect(voteDto).toBeInstanceOf(CreateVoteDto);
      expect(voteDto.proposalId).toBe(rawData.proposalId);
      expect(voteDto.daoId).toBe(rawData.daoId);
      expect(voteDto.voterAddress).toBe(rawData.voterAddress);
      expect(voteDto.choice).toBe(rawData.choice);
      expect(voteDto.comment).toBe(rawData.comment);
    });
  });
}); 