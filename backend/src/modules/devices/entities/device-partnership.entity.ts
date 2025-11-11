import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'device_partnerships', timestamps: true })
export class DevicePartnership extends Document {
  @Prop({ required: true, unique: true })
  partnershipId: string;
  
  // Relationship
  @Prop({ required: true, index: true })
  deviceId: string;
  
  @Prop({ required: true, index: true })
  userWallet: string;  // User's Hedera wallet address
  
  // Share ownership
  @Prop({ required: true, min: 0, max: 100 })
  sharePercentage: number;  // % of device ownership
  
  @Prop({ required: true, min: 1 })
  numberOfShares: number;   // Actual shares owned
  
  // Purchase details
  @Prop({ required: true })
  purchasePrice: number;    // Total HBAR paid
  
  @Prop({ required: true })
  purchaseDate: Date;
  
  @Prop({ required: true })
  purchaseTransactionId: string;  // Hedera transaction hash
  
  // NFT representation (optional - can mint partnership as NFT)
  @Prop({ required: false })
  partnershipNftId?: string;
  
  @Prop({ required: false })
  nftSerialNumber?: number;
  
  // Status
  @Prop({ required: true, default: 'active' })
  status: string;  // active/transferred/revoked
  
  // Rewards tracking
  @Prop({ type: Object, default: { totalCredits: 0 } })
  rewardsEarned: {
    totalCredits: number;
    lastPayoutDate?: Date;
    lastPayoutAmount?: number;
    payoutHistory?: Array<{
      date: Date;
      amount: number;
      transactionId?: string;
    }>;
  };
  
  @Prop({ required: false })
  createdAt?: Date;
  
  @Prop({ required: false })
  updatedAt?: Date;
}

export const DevicePartnershipSchema = SchemaFactory.createForClass(DevicePartnership);

// Compound indexes for efficient queries
DevicePartnershipSchema.index({ deviceId: 1, userWallet: 1 }, { unique: true });
DevicePartnershipSchema.index({ userWallet: 1, status: 1 });
DevicePartnershipSchema.index({ deviceId: 1, status: 1 });

