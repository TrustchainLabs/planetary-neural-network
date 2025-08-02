import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { Unit } from '../../../shared/enums';

export class CreateTemperatureReadingDto {
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(-100) // Minimum realistic temperature
  @Max(100)  // Maximum realistic temperature
  value: number;

  @IsOptional()
  unit?: Unit.CELCIUS = Unit.CELCIUS;

  @IsOptional()
  timestamp?: Date;

  @IsOptional()
  location?: {
    latitude: number;
    longitude: number;
  };
} 