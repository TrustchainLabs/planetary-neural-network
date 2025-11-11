import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { DeviceType } from '../entities/device.entity';

export class AvailableDevicesQueryDto {
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @IsOptional()
  @IsString()
  hexId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minShares?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

