import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { Unit } from '../../../shared/enums';

export class CreateDHT11ReadingDto {
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(-100) // Minimum realistic temperature
  @Max(100)  // Maximum realistic temperature
  temperature: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)    // Minimum humidity
  @Max(100)  // Maximum humidity
  humidity: number;

  @IsOptional()
  temperatureUnit?: Unit.CELCIUS = Unit.CELCIUS;

  @IsOptional()
  humidityUnit?: string = '%';

  @IsOptional()
  timestamp?: Date;

  @IsOptional()
  location?: {
    latitude: number;
    longitude: number;
  };

  @IsOptional()
  gpioPin?: number; // GPIO pin used (e.g., 4 for D4)

  @IsOptional()
  sensorType?: string = 'DHT11';
} 