import { Injectable, NotFoundException, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { ReadDevicesDto } from './dto/read-device.dto'
import { Device } from './entities/device.entity';
import { DeviceModelService } from './devices.model.service';
import { GeoMedallionsService } from '../geo-medallions/geo-medallions.service';
import { Model } from 'mongoose';
import { Config, ConfigDocument } from '../config/entities/config.entity';

@Injectable()
export class DevicesService  {

  constructor(
    private readonly deviceModelService: DeviceModelService,
    private readonly geoMedallionsService: GeoMedallionsService,
    @InjectModel('Config') private readonly configModel: Model<ConfigDocument>,
    @InjectQueue('device') private readonly deviceQueue: Queue
  ) {}

  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    // Validate medallion exists and is available
    try {
      const medallion = await this.geoMedallionsService.findOne(createDeviceDto.hexId);
      
      // Check if medallion is owned (not required but recommended)
      if (!medallion.ownerAddress) {
        console.warn(`Warning: Placing device on unowned medallion ${createDeviceDto.hexId}`);
      }

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException(`Medallion ${createDeviceDto.hexId} not found`);
      }
      throw error;
    }

    // Create the device
    const device = await this.deviceModelService.create(createDeviceDto);
    
    // Update medallion with device data
    try {
      await this.geoMedallionsService.addDeviceToMedallion(createDeviceDto.hexId, {
        deviceId: device.deviceId,
        name: device.name,
        ownerAddress: device.ownerAddress,
        createdAt: new Date()
      });
    } catch (error) {
      console.error(`Failed to update medallion ${createDeviceDto.hexId} with device data:`, error);
      // Continue with device creation even if medallion update fails
    }

    // Get collection configuration from database
    const config = await this.configModel.findOne({ 
      'smart_devices_config': { $exists: true }
    });

    if (!config || !config.smart_devices_config) {
      throw new Error('Smart devices collection configuration not found in database');
    }

    const job = await this.deviceQueue.add('process-device-creation', {
      deviceId: device.deviceId,
      ownerAddress: device.ownerAddress,
      smartDevicesConfig: config.smart_devices_config,
      rewardTokenId: config.reward_token_config.token_id
    });

    job.finished().then(async (result) => {
      console.log('Device creation completed', result);
      // Update device with Hedera account and topic information
      if (result && result.hederaAccount && result.hcsTopic) {
        await this.deviceModelService.update(device.deviceId, {
          hederaAccount: result.hederaAccount,
          hcsTopic: result.hcsTopic,
          privateKey: result.privateKey,
          publicKey: result.publicKey
        });
      }
    });
    return device;
  }

  async findAll (readDevicesDto: ReadDevicesDto) {
    const { ids, includeLatestMeasurement } = readDevicesDto

    if (ids?.length) {
      const devices = await this.deviceModelService.findAll();
      
      if (!devices?.length) {
        throw new HttpException('No device found', HttpStatus.NOT_FOUND);
      }
      return devices;
    }

    return await this.deviceModelService.findAll();
  }

  async findOne(uuid: string, ownerId: string): Promise<Device> {
    const device = await this.deviceModelService
      .findOne(uuid);
  
    if (!device) {
      throw new NotFoundException('Device not found');
    }
  
    return device;
  }

  async update(
    id: string,
    ownerId: string,
    updateDeviceDto: UpdateDeviceDto,
  ): Promise<Device> {
    const updatedDevice = await this.deviceModelService.update(id, updateDeviceDto);
    if (!updatedDevice) {
      throw new NotFoundException('Device not found');
    }
    return updatedDevice;
  }

  async remove(id: string, ownerId: string): Promise<Device> {
    // Get device before removal to access hexId
    const deviceToRemove = await this.deviceModelService.findOne(id);
    if (!deviceToRemove) {
      throw new NotFoundException('Device not found');
    }

    const removedDevice = await this.deviceModelService.remove(id);
    if (!removedDevice) {
      throw new NotFoundException('Device not found');
    }

    // Remove device from medallion
    if (deviceToRemove.hexId) {
      try {
        await this.geoMedallionsService.removeDeviceFromMedallion(deviceToRemove.hexId, id);
      } catch (error) {
        console.error(`Failed to remove device ${id} from medallion ${deviceToRemove.hexId}:`, error);
        // Continue with device removal even if medallion update fails
      }
    }

    return removedDevice;
  }
}