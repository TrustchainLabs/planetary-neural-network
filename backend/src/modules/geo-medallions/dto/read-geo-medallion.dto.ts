import { IsOptional, IsString, IsBoolean, IsNumber, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * @class ReadGeoMedallionDto
 * @description DTO for querying geo medallions
 */
export class ReadGeoMedallionDto {
  @ApiPropertyOptional({ description: 'Filter by availability', example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  available?: boolean;

  @ApiPropertyOptional({ description: 'Filter by owner address', example: '0.0.12345' })
  @IsOptional()
  @IsString()
  ownerAddress?: string;

  @ApiPropertyOptional({ description: 'Filter by specific hex IDs', example: ['hex_nyc_001', 'hex_nyc_002'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hexIds?: string[];

  @ApiPropertyOptional({ description: 'Maximum price filter', example: 500 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Minimum price filter', example: 100 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Search within latitude range (center)', example: 40.7128 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  centerLat?: number;

  @ApiPropertyOptional({ description: 'Search within longitude range (center)', example: -74.0060 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  centerLng?: number;

  @ApiPropertyOptional({ description: 'Search radius in kilometers', example: 10 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Page number for pagination', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}