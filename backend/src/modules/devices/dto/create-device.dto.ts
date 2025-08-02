import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeviceDto {
  @ApiProperty({ description: 'Name of the device' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Owner of the device' })
  @IsOptional()
  @IsString()
  owner?: string;
}
