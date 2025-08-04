import { IsOptional, IsString, IsBoolean, IsDate, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * @class UpdateGeoMedallionDto
 * @description DTO for updating a geo medallion
 */
export class UpdateGeoMedallionDto {
  @ApiPropertyOptional({ description: 'Price in HBAR', example: 100, minimum: 0 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: 'Whether the medallion is available for purchase', example: true })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
  @ApiPropertyOptional({ description: 'Owner wallet address', example: '0.0.12345' })
  @IsOptional()
  @IsString()
  ownerAddress?: string;

  @ApiPropertyOptional({ description: 'NFT token ID', example: '0.0.67890' })
  @IsOptional()
  @IsString()
  nftTokenId?: string;

  @ApiPropertyOptional({ description: 'Associated Hedera topic ID', example: '0.0.11111' })
  @IsOptional()
  @IsString()
  hederaTopicId?: string;

  @ApiPropertyOptional({ description: 'Purchase transaction ID', example: '0.0.12345@1234567890.123456789' })
  @IsOptional()
  @IsString()
  purchaseTransactionId?: string;

  @ApiPropertyOptional({ description: 'Purchase timestamp', example: '2024-01-15T10:30:00Z' })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  purchasedAt?: Date;

  @ApiPropertyOptional({ description: 'NFT mint transaction ID', example: '0.0.12345@1234567890.123456790' })
  @IsOptional()
  @IsString()
  mintTransactionId?: string;

  @ApiPropertyOptional({ description: 'NFT mint timestamp', example: '2024-01-15T10:35:00Z' })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  mintedAt?: Date;
}