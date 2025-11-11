import { Controller, Get, Post, Query, Param, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { DevicePartnershipService } from './device-partnership.service';
import { PurchaseDeviceShareDto } from './dto/purchase-device-share.dto';
import { ReadDevicePartnershipsDto } from './dto/read-device-partnerships.dto';
import { AvailableDevicesQueryDto } from './dto/available-devices-query.dto';

@Controller('devices/partnerships')
export class DevicePartnershipController {
  constructor(private readonly partnershipService: DevicePartnershipService) {}

  /**
   * Get available devices for partnership
   * GET /devices/partnerships/available
   */
  @Get('/available')
  async getAvailableDevices(@Query() query: AvailableDevicesQueryDto) {
    return {
      success: true,
      data: await this.partnershipService.getAvailableDevices(query)
    };
  }

  /**
   * Get device details with partnership information
   * GET /devices/partnerships/device/:deviceId
   */
  @Get('/device/:deviceId')
  async getDeviceDetails(@Param('deviceId') deviceId: string) {
    return {
      success: true,
      data: await this.partnershipService.getDeviceWithPartnershipDetails(deviceId)
    };
  }

  /**
   * Purchase device shares
   * POST /devices/partnerships/purchase
   */
  @Post('/purchase')
  @HttpCode(HttpStatus.CREATED)
  async purchaseShares(@Body() dto: PurchaseDeviceShareDto) {
    return {
      success: true,
      message: 'Partnership created successfully',
      data: await this.partnershipService.purchaseShares(dto)
    };
  }

  /**
   * Get user's partnerships
   * GET /devices/partnerships/user/:wallet
   */
  @Get('/user/:wallet')
  async getUserPartnerships(
    @Param('wallet') wallet: string,
    @Query() filters: ReadDevicePartnershipsDto
  ) {
    return {
      success: true,
      data: await this.partnershipService.getUserPartnerships(wallet, filters)
    };
  }

  /**
   * Get user's partnership statistics
   * GET /devices/partnerships/user/:wallet/stats
   */
  @Get('/user/:wallet/stats')
  async getUserStats(@Param('wallet') wallet: string) {
    return {
      success: true,
      data: await this.partnershipService.getUserPartnershipStats(wallet)
    };
  }

  /**
   * Get all partners of a device
   * GET /devices/partnerships/device/:deviceId/partners
   */
  @Get('/device/:deviceId/partners')
  async getDevicePartners(@Param('deviceId') deviceId: string) {
    return {
      success: true,
      data: await this.partnershipService.getDevicePartners(deviceId)
    };
  }

  /**
   * Get device revenue statistics
   * GET /devices/partnerships/device/:deviceId/revenue
   */
  @Get('/device/:deviceId/revenue')
  async getDeviceRevenue(@Param('deviceId') deviceId: string) {
    return {
      success: true,
      data: await this.partnershipService.getDeviceRevenueStats(deviceId)
    };
  }
}

