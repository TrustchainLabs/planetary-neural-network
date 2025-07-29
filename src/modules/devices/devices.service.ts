import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { ReadDevicesDto } from './dto/read-device.dto'
import { Device } from './entities/device.entity';
import { DeviceModelService } from './devices.model.service';

@Injectable()
export class DevicesService  {

  constructor(
    private readonly deviceModelService: DeviceModelService,
    @InjectQueue('device') private readonly deviceQueue: Queue
  ) {}

  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    const device = await this.deviceModelService.create(createDeviceDto);
    const job = await this.deviceQueue.add('process-device-creation', {
      deviceId: device.deviceId,
      ownerAddress: device.ownerAddress
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
    const removedDevice = await this.deviceModelService.remove(id);
    if (!removedDevice) {
      throw new NotFoundException('Device not found');
    }
    return removedDevice;
  }
}