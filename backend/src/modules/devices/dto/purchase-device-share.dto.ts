import { IsString, IsNumber, Min, IsNotEmpty } from 'class-validator';

export class PurchaseDeviceShareDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsNumber()
  @Min(1)
  numberOfShares: number;

  @IsString()
  @IsNotEmpty()
  buyerWallet: string;

  @IsString()
  @IsNotEmpty()
  paymentTransactionId: string;
}

