import { Controller, Get, Post, Body, Query, Param, Delete, Put, Request, HttpCode, HttpStatus, BadRequestException, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { ReadDevicesDto } from './dto/read-device.dto'
import { Device } from './entities/device.entity';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {

  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new device' })
  @ApiResponse({ status: 201, description: 'The device has been successfully created.', type: Device })
  create(@Request() req, @Body(new ValidationPipe()) createDeviceDto: CreateDeviceDto) {
    try {
      return this.devicesService.create({ ...createDeviceDto, owner: req.user?._id || createDeviceDto.owner || 'anonymous' });
    } catch (error) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: error.message,
        errors: error.errors
      });
    }
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all devices' })
  @ApiResponse({ status: 200, description: 'List of devices.', type: [Device] })
  findAll(@Query() readDevicesDto: ReadDevicesDto) {
    try {
      return this.devicesService.findAll(readDevicesDto);
    } catch (error) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: error.message,
        errors: error.errors
      });
    }
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Retrieve a specific device by UUID' })
  @ApiResponse({ status: 200, description: 'The device details.', type: Device })
  findOne(@Request() req, @Param('uuid') uuid: string) {
    try {
      return this.devicesService.findOne(uuid, req.user?._id || 'anonymous');
    } catch (error) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: error.message,
        errors: error.errors
      });
    }
  }

  @Put(':uuid')
  @ApiOperation({ summary: 'Update a specific device by UUID' })
  @ApiResponse({ status: 200, description: 'The device has been successfully updated.', type: Device })
  update(
    @Request() req,
    @Param('uuid') uuid: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ) {
    try {
      return this.devicesService.update(uuid, req.user?._id || 'anonymous', updateDeviceDto);
    } catch (error) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: error.message,
        errors: error.errors
      });
    }
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Delete a specific device by UUID' })
  @ApiResponse({ status: 200, description: 'The device has been successfully deleted.', type: Device })
  remove(@Request() req, @Param('uuid') uuid: string) {
    try {
      return this.devicesService.remove(uuid, req.user?._id || 'anonymous');
    } catch (error) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: error.message,
        errors: error.errors
      });
    }
  }
}
