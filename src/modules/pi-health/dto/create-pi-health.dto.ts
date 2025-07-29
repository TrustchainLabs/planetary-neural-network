import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreatePiHealthDto {
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(-100)
  @Max(100)
  cpuTemperature: number; // CPU temperature in °C

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  cpuUsage: number; // CPU usage percentage

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  memoryUsage: number; // Memory usage percentage

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  diskUsage: number; // Disk usage percentage

  @IsOptional()
  @IsNumber()
  @Min(0)
  networkUpload?: number; // Network upload in MB/s

  @IsOptional()
  @IsNumber()
  @Min(0)
  networkDownload?: number; // Network download in MB/s

  @IsOptional()
  @IsNumber()
  @Min(0)
  uptime?: number; // System uptime in seconds

  @IsOptional()
  @IsNumber()
  @Min(0)
  loadAverage1m?: number; // 1-minute load average

  @IsOptional()
  @IsNumber()
  @Min(0)
  loadAverage5m?: number; // 5-minute load average

  @IsOptional()
  @IsNumber()
  @Min(0)
  loadAverage15m?: number; // 15-minute load average

  @IsOptional()
  @IsNumber()
  @Min(0)
  voltage?: number; // CPU voltage in V

  @IsOptional()
  @IsNumber()
  @Min(0)
  frequency?: number; // CPU frequency in MHz

  @IsOptional()
  @IsString()
  timestamp?: Date;

  @IsOptional()
  location?: {
    latitude: number;
    longitude: number;
  };

  @IsOptional()
  @IsString()
  alertLevel?: 'normal' | 'warning' | 'critical' | 'emergency';

  @IsOptional()
  @IsString()
  alertMessage?: string;
} 