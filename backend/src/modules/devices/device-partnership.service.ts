import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device } from './entities/device.entity';
import { DevicePartnership } from './entities/device-partnership.entity';
import { PurchaseDeviceShareDto } from './dto/purchase-device-share.dto';
import { ReadDevicePartnershipsDto } from './dto/read-device-partnerships.dto';
import { AvailableDevicesQueryDto } from './dto/available-devices-query.dto';

@Injectable()
export class DevicePartnershipService {
  private readonly logger = new Logger(DevicePartnershipService.name);

  constructor(
    @InjectModel(Device.name) private deviceModel: Model<Device>,
    @InjectModel(DevicePartnership.name) private partnershipModel: Model<DevicePartnership>
  ) {}

  /**
   * Get available devices for partnership
   */
  async getAvailableDevices(query: AvailableDevicesQueryDto): Promise<Device[]> {
    const filter: any = {
      status: 'active',
      owner: 'licor',
      availableShares: { $gt: 0 }
    };

    if (query.deviceType) {
      filter.deviceType = query.deviceType;
    }

    if (query.hexId) {
      filter.hexId = query.hexId;
    }

    if (query.minShares) {
      filter.availableShares = { $gte: query.minShares };
    }

    if (query.maxPrice) {
      filter.pricePerShare = { $lte: query.maxPrice };
    }

    return await this.deviceModel
      .find(filter)
      .limit(query.limit || 50)
      .skip(query.offset || 0)
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get device details with partnership info
   */
  async getDeviceWithPartnershipDetails(deviceId: string): Promise<any> {
    const device = await this.deviceModel.findOne({ deviceId }).exec();
    
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const partnerships = await this.partnershipModel
      .find({ deviceId, status: 'active' })
      .exec();

    return {
      device,
      partnerships: {
        total: partnerships.length,
        list: partnerships
      },
      availability: {
        totalShares: device.totalShares,
        soldShares: device.soldShares,
        availableShares: device.availableShares,
        percentageSold: (device.soldShares / device.totalShares) * 100
      }
    };
  }

  /**
   * Purchase device shares
   */
  async purchaseShares(dto: PurchaseDeviceShareDto): Promise<DevicePartnership> {
    const device = await this.deviceModel.findOne({ deviceId: dto.deviceId }).exec();
    
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.owner !== 'licor') {
      throw new BadRequestException('This device is not available for partnership purchases');
    }

    if (device.status !== 'active') {
      throw new BadRequestException('Device is not currently active');
    }

    if (device.availableShares < dto.numberOfShares) {
      throw new BadRequestException(
        `Not enough shares available. Only ${device.availableShares} shares remaining`
      );
    }

    // Check if user already has a partnership with this device
    const existingPartnership = await this.partnershipModel
      .findOne({ deviceId: dto.deviceId, userWallet: dto.buyerWallet })
      .exec();

    if (existingPartnership) {
      throw new BadRequestException(
        'You already have a partnership with this device. Transfer shares or create a new partnership from another wallet.'
      );
    }

    // Calculate share percentage
    const sharePercentage = (dto.numberOfShares / device.totalShares) * 100;
    const purchasePrice = dto.numberOfShares * device.pricePerShare;

    this.logger.log(`Processing purchase: ${dto.numberOfShares} shares of device ${dto.deviceId} for ${purchasePrice} HBAR`);

    // TODO: Verify payment transaction on Hedera
    // await this.verifyHederaTransaction(dto.paymentTransactionId, purchasePrice);

    // Create partnership
    const partnership = await this.partnershipModel.create({
      partnershipId: `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deviceId: dto.deviceId,
      userWallet: dto.buyerWallet,
      sharePercentage,
      numberOfShares: dto.numberOfShares,
      purchasePrice,
      purchaseDate: new Date(),
      purchaseTransactionId: dto.paymentTransactionId,
      status: 'active',
      rewardsEarned: { 
        totalCredits: 0,
        payoutHistory: []
      }
    });

    // Update device shares
    await this.deviceModel.updateOne(
      { deviceId: dto.deviceId },
      {
        $inc: { 
          soldShares: dto.numberOfShares,
          availableShares: -dto.numberOfShares
        }
      }
    ).exec();

    this.logger.log(`Partnership created: ${partnership.partnershipId} for wallet ${dto.buyerWallet}`);

    return partnership;
  }

  /**
   * Get user's partnerships
   */
  async getUserPartnerships(userWallet: string, filters?: ReadDevicePartnershipsDto): Promise<any[]> {
    const query: any = {
      userWallet,
      status: filters?.status || 'active'
    };

    const partnerships = await this.partnershipModel
      .find(query)
      .limit(filters?.limit || 50)
      .skip(filters?.offset || 0)
      .sort({ createdAt: -1 })
      .exec();

    // Enrich with device details
    const enrichedPartnerships = await Promise.all(
      partnerships.map(async (partnership) => {
        const device = await this.deviceModel
          .findOne({ deviceId: partnership.deviceId })
          .exec();
        
        return {
          partnership: partnership.toObject(),
          device: device ? device.toObject() : null
        };
      })
    );

    return enrichedPartnerships;
  }

  /**
   * Get all partners of a device
   */
  async getDevicePartners(deviceId: string): Promise<DevicePartnership[]> {
    return await this.partnershipModel
      .find({ deviceId, status: 'active' })
      .sort({ sharePercentage: -1 })
      .exec();
  }

  /**
   * Calculate and distribute rewards to device partners
   */
  async distributeRewards(deviceId: string, totalCredits: number): Promise<void> {
    const partners = await this.getDevicePartners(deviceId);
    
    if (partners.length === 0) {
      this.logger.warn(`No active partners found for device ${deviceId}`);
      return;
    }

    this.logger.log(`Distributing ${totalCredits} credits among ${partners.length} partners for device ${deviceId}`);

    for (const partner of partners) {
      const partnerCredits = (partner.sharePercentage / 100) * totalCredits;
      
      this.logger.log(`Partner ${partner.userWallet} receiving ${partnerCredits} credits (${partner.sharePercentage}% share)`);

      // Update partnership rewards
      await this.partnershipModel.updateOne(
        { partnershipId: partner.partnershipId },
        {
          $inc: { 'rewardsEarned.totalCredits': partnerCredits },
          $set: { 
            'rewardsEarned.lastPayoutDate': new Date(),
            'rewardsEarned.lastPayoutAmount': partnerCredits
          },
          $push: {
            'rewardsEarned.payoutHistory': {
              date: new Date(),
              amount: partnerCredits
            }
          }
        }
      ).exec();

      // TODO: Trigger actual credit transfer to partner's wallet
      // await this.transferCreditsToWallet(partner.userWallet, partnerCredits);
    }

    this.logger.log(`Reward distribution completed for device ${deviceId}`);
  }

  /**
   * Get partnership statistics for a user
   */
  async getUserPartnershipStats(userWallet: string): Promise<any> {
    const partnerships = await this.partnershipModel
      .find({ userWallet, status: 'active' })
      .exec();

    const totalInvestment = partnerships.reduce((sum, p) => sum + p.purchasePrice, 0);
    const totalCredits = partnerships.reduce((sum, p) => sum + p.rewardsEarned.totalCredits, 0);
    const totalShares = partnerships.reduce((sum, p) => sum + p.numberOfShares, 0);

    return {
      totalPartnerships: partnerships.length,
      totalInvestment,
      totalCreditsEarned: totalCredits,
      totalSharesOwned: totalShares,
      partnerships: partnerships.map(p => ({
        deviceId: p.deviceId,
        shares: p.numberOfShares,
        percentage: p.sharePercentage,
        investment: p.purchasePrice,
        credits: p.rewardsEarned.totalCredits
      }))
    };
  }

  /**
   * Get device revenue statistics
   */
  async getDeviceRevenueStats(deviceId: string): Promise<any> {
    const device = await this.deviceModel.findOne({ deviceId }).exec();
    
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const partnerships = await this.partnershipModel
      .find({ deviceId, status: 'active' })
      .exec();

    const totalRevenue = partnerships.reduce((sum, p) => sum + p.purchasePrice, 0);
    const totalCreditsDistributed = partnerships.reduce(
      (sum, p) => sum + p.rewardsEarned.totalCredits,
      0
    );

    return {
      deviceId: device.deviceId,
      deviceName: device.name,
      totalShares: device.totalShares,
      soldShares: device.soldShares,
      availableShares: device.availableShares,
      pricePerShare: device.pricePerShare,
      totalRevenue,
      totalPartners: partnerships.length,
      totalCreditsDistributed,
      status: device.status
    };
  }
}

