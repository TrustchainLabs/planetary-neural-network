import { IsNotEmpty, IsString } from 'class-validator';

export class StopDataCollectionDto {
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @IsNotEmpty()
  @IsString()
  privateKey: string;
}