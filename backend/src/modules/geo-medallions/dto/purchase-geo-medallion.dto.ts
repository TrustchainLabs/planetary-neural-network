import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class PurchaseGeoMedallionDto
 * @description DTO for purchasing a geo medallion
 */
export class PurchaseGeoMedallionDto {
  @ApiProperty({ description: 'Buyer wallet address', example: '0.0.12345' })
  @IsString()
  buyerAddress: string;

  @ApiProperty({ description: 'Transaction hash for payment verification', example: '0.0.12345@1234567890.123456789' })
  @IsString()
  paymentTransactionId: string;
}