import { IsNotEmpty, IsString } from 'class-validator';

export class StartDataCollectionDto {
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @IsNotEmpty()
  @IsString()
  privateKey: string;
}