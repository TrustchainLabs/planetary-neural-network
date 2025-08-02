import { IsOptional, IsString, IsNumber, IsDateString, IsBoolean } from 'class-validator';

export class ReadTemperatureReadingsDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  limit?: number = 100;

  @IsOptional()
  @IsNumber()
  offset?: number = 0;

  @IsOptional()
  @IsBoolean()
  processedOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAiAnalysis?: boolean;
} 