import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';

export class ReadDevicePartnershipsDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  userWallet?: string;

  @IsOptional()
  @IsEnum(['active', 'transferred', 'revoked'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

