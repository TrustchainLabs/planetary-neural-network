import { IsNumber, IsOptional, ValidateNested, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * @class CoordinateDto
 * @description DTO for geographic coordinates
 */
export class CoordinateDto {
  @ApiProperty({ description: 'Latitude coordinate', example: 40.7128 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate', example: -74.0060 })
  @IsNumber()
  longitude: number;
}

/**
 * @class CreateGeoMedallionDto
 * @description DTO for creating a new geo medallion with 5km radius area
 */
export class CreateGeoMedallionDto {
  @ApiProperty({ 
    description: 'Center coordinates of the hexagon (5km radius area will be generated)', 
    type: CoordinateDto,
    example: { latitude: 40.7128, longitude: -74.0060 }
  })
  @ValidateNested()
  @Type(() => CoordinateDto)
  center: CoordinateDto;

  @ApiProperty({ description: 'Price in HBAR', example: 1, minimum: 0 })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ description: 'Whether the medallion is available for purchase', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}