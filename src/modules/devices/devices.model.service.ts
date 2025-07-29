import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class DeviceModelService {
  /**
   * @constructor
   * @description Creates a new instance of DeviceModelService
   * 
   * @param {Model<DeviceDocument>} deviceModel - Mongoose model for the Device collection
   */
  constructor(
    @InjectModel(Device.name) private deviceModel: Model<Device>
  ) {}

  /**
   * @method create
   * @description Creates a new Device in the database
   * 
   * This method creates a new Device entity in the database based on the 
   * provided data. It generates a unique deviceId automatically.
   * 
   * @param {CreateDeviceDto} createDeviceDto - Data transfer object containing Device creation parameters
   * @returns {Promise<Device>} The newly created Device entity
   */
  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    const deviceId = `device-${randomUUID()}`;
    
    const device = new this.deviceModel({
      deviceId,
      name: createDeviceDto.name,
      ownerAddress: createDeviceDto.owner || 'anonymous'
    });

    return device.save();
  }

  async findAll(): Promise<Device[]> {
    return this.deviceModel.find().exec();
  }

  async findOne(deviceId: string): Promise<Device> {
    return this.deviceModel.findOne({ deviceId }).exec();
  }

  async update(deviceId: string, updateData: Partial<Device>): Promise<Device> {
    const device = await this.deviceModel.findOneAndUpdate(
      { deviceId },
      updateData,
      { new: true }
    ).exec();
    
    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }
    
    return device;
  }

  async remove(deviceId: string): Promise<Device> {
    const device = await this.deviceModel.findOneAndDelete({ deviceId }).exec();
    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }
    return device;
  }

} 