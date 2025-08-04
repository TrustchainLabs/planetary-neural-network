import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeviceDto {
  @ApiProperty({ description: 'Name of the device' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Hex ID of the medallion where the device will be placed', example: 'hex_lat40_7128_lng-74_0060' })
  @IsString()
  @IsNotEmpty()
  hexId: string;

  @ApiProperty({ description: 'Owner of the device' })
  @IsOptional()
  @IsString()
  owner?: string;
}
