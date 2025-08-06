import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Model } from 'mongoose';
import { Queue } from 'bull';
import { LoggerHelper } from '@hsuite/helpers';
import { GeoMedallion } from './entities/geo-medallion.entity';
import { CreateGeoMedallionDto } from './dto/create-geo-medallion.dto';
import { UpdateGeoMedallionDto } from './dto/update-geo-medallion.dto';
import { ReadGeoMedallionDto } from './dto/read-geo-medallion.dto';
import { PurchaseGeoMedallionDto } from './dto/purchase-geo-medallion.dto';
import { Config } from '../config/entities/config.entity';

/**
 * @interface IPaginatedResult
 * @description Paginated result interface
 */
export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * @interface IPurchaseResult
 * @description Purchase result interface
 */
export interface IPurchaseResult {
  medallion: GeoMedallion;
  status: string;
  message: string;
  jobId: string;
}

/**
 * @class GeoMedallionsService
 * @description Service for managing geo medallions (hexagonal NFT territories)
 * 
 * This service handles the creation, querying, and purchasing of geographic
 * medallions that represent hexagonal areas on a map. Each medallion is an NFT
 * that grants territorial access rights for IoT device placement.
 */
@Injectable()
export class GeoMedallionsService {
  private readonly logger: LoggerHelper = new LoggerHelper(GeoMedallionsService.name);

  constructor(
    @InjectModel(GeoMedallion.name) private geoMedallionModel: Model<GeoMedallion>,
    @InjectModel(Config.name) private configModel: Model<Config>,
    @InjectQueue('geo-medallions') private readonly medallionQueue: Queue
  ) {}

  /**
   * @method create
   * @description Creates a new geo medallion with auto-generated hexagon
   * 
   * Automatically generates:
   * - hexId based on coordinates
   * - vertices for a 5km radius hexagon around the center
   * 
   * @param {CreateGeoMedallionDto} createGeoMedallionDto - Medallion creation data
   * @returns {Promise<GeoMedallion>} Created medallion
   */
  async create(createGeoMedallionDto: CreateGeoMedallionDto): Promise<GeoMedallion> {
    try {
      const { center, price, available } = createGeoMedallionDto;
      
      // Generate hexId based on coordinates
      const hexId = this.generateHexId(center.latitude, center.longitude);
      
      // Check if hex ID already exists
      const existingMedallion = await this.geoMedallionModel.findOne({ hexId });
      if (existingMedallion) {
        throw new ConflictException(`Medallion for this location already exists (${hexId})`);
      }

      // Generate hexagon vertices with 5km radius
      const vertices = this.generateHexagonVertices(center.latitude, center.longitude, 5);

      const medallion = new this.geoMedallionModel({
        hexId,
        center,
        vertices,
        price,
        available: available ?? true,
        metadata: {
          name: `GeoMedallion ${hexId}`,
          description: `5km radius territory centered at ${center.latitude}, ${center.longitude}`,
          attributes: [
            { trait_type: 'Radius', value: '5km' },
            { trait_type: 'Center Lat', value: center.latitude },
            { trait_type: 'Center Lng', value: center.longitude },
            { trait_type: 'Price', value: price }
          ]
        }
      });

      const savedMedallion = await medallion.save();
      this.logger.debug(`Created geo medallion: ${savedMedallion.hexId} at ${center.latitude}, ${center.longitude}`);
      
      return savedMedallion;
    } catch (error) {
      this.logger.error(`Failed to create geo medallion: ${error.message}`);
      throw error;
    }
  }

  /**
   * @method generateHexId
   * @description Generates a unique hex ID based on coordinates
   * 
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {string} Generated hex ID
   */
  private generateHexId(lat: number, lng: number): string {
    // Round coordinates to 4 decimal places for consistent IDs
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;
    
    // Format as hex_lat{lat}_lng{lng}
    const latStr = roundedLat.toString().replace('.', '_').replace('-', 'n');
    const lngStr = roundedLng.toString().replace('.', '_').replace('-', 'n');
    
    return `hex_lat${latStr}_lng${lngStr}`;
  }

  /**
   * @method generateHexagonVertices
   * @description Generates vertices for a regular hexagon
   * 
   * @param {number} centerLat - Center latitude
   * @param {number} centerLng - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Array} Array of coordinate objects
   */
  private generateHexagonVertices(centerLat: number, centerLng: number, radiusKm: number): Array<{latitude: number, longitude: number}> {
    const vertices = [];
    const kmPerDegreeLat = 111; // Approximate km per degree latitude
    const kmPerDegreeLng = 111 * Math.cos(centerLat * Math.PI / 180); // Adjust for longitude at this latitude
    
    // Generate 6 vertices for a regular hexagon (angles: 0°, 60°, 120°, 180°, 240°, 300°)
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * Math.PI / 180; // Convert to radians
      
      const deltaLat = (radiusKm / kmPerDegreeLat) * Math.sin(angle);
      const deltaLng = (radiusKm / kmPerDegreeLng) * Math.cos(angle);
      
      vertices.push({
        latitude: centerLat + deltaLat,
        longitude: centerLng + deltaLng
      });
    }
    
    return vertices;
  }


  /**
   * @method findAll
   * @description Retrieves geo medallions with filtering and pagination
   * 
   * @param {ReadGeoMedallionDto} query - Query parameters
   * @returns {Promise<IPaginatedResult<GeoMedallion>>} Paginated medallions
   */
  async findAll(query: ReadGeoMedallionDto): Promise<IPaginatedResult<GeoMedallion>> {
    try {
      const {
        available,
        ownerAddress,
        hexIds,
        maxPrice,
        minPrice,
        centerLat,
        centerLng,
        radiusKm,
        page = 1,
        limit = 10
      } = query;

      // Build filter object
      const filter: any = {};

      if (available !== undefined) {
        filter.available = available;
      }

      if (ownerAddress) {
        filter.ownerAddress = ownerAddress;
      }

      if (hexIds && hexIds.length > 0) {
        filter.hexId = { $in: hexIds };
      }

      if (maxPrice !== undefined || minPrice !== undefined) {
        filter.price = {};
        if (maxPrice !== undefined) filter.price.$lte = maxPrice;
        if (minPrice !== undefined) filter.price.$gte = minPrice;
      }

      // Geographic filtering (simplified - for production use proper geo queries)
      if (centerLat !== undefined && centerLng !== undefined && radiusKm !== undefined) {
        const latRange = radiusKm / 111; // Rough km to degree conversion
        const lngRange = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));
        
        filter['center.latitude'] = {
          $gte: centerLat - latRange,
          $lte: centerLat + latRange
        };
        filter['center.longitude'] = {
          $gte: centerLng - lngRange,
          $lte: centerLng + lngRange
        };
      }

      const skip = (page - 1) * limit;

      // Execute query with pagination
      const [data, total] = await Promise.all([
        this.geoMedallionModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        this.geoMedallionModel.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve geo medallions: ${error.message}`);
      throw error;
    }
  }

  /**
   * @method findOne
   * @description Retrieves a specific geo medallion by hex ID
   * 
   * @param {string} hexId - Hex ID of the medallion
   * @returns {Promise<GeoMedallion>} The medallion
   */
  async findOne(hexId: string): Promise<GeoMedallion> {
    try {
      const medallion = await this.geoMedallionModel.findOne({ hexId });
      
      if (!medallion) {
        throw new NotFoundException(`Geo medallion with hexId ${hexId} not found`);
      }

      return medallion;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve geo medallion ${hexId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * @method update
   * @description Updates a geo medallion
   * 
   * @param {string} hexId - Hex ID of the medallion
   * @param {UpdateGeoMedallionDto} updateGeoMedallionDto - Update data
   * @returns {Promise<GeoMedallion>} Updated medallion
   */
  async update(hexId: string, updateGeoMedallionDto: UpdateGeoMedallionDto): Promise<GeoMedallion> {
    try {
      const medallion = await this.geoMedallionModel.findOneAndUpdate(
        { hexId },
        updateGeoMedallionDto,
        { new: true }
      );

      if (!medallion) {
        throw new NotFoundException(`Geo medallion with hexId ${hexId} not found`);
      }

      this.logger.debug(`Updated geo medallion: ${hexId}`);
      return medallion;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update geo medallion ${hexId}: ${error.message}`);
      throw error;
    }
  }



  /**
   * @method purchase
   * @description Initiates the purchase process for a geo medallion
   * 
   * This method handles the purchase request flow:
   * 1. Validates medallion availability
   * 2. Validates payment transaction ID
   * 3. Reserves the medallion with status "reserved"
   * 4. Adds NFT minting job to the queue
   * 
   * @param {string} hexId - Hex ID of the medallion to purchase
   * @param {PurchaseGeoMedallionDto} purchaseDto - Purchase data including transaction ID
   * @returns {Promise<IPurchaseResult>} Purchase result with job details
   */
  async purchase(hexId: string, purchaseDto: PurchaseGeoMedallionDto): Promise<IPurchaseResult> {
    try {
      this.logger.debug(`Starting purchase process for medallion: ${hexId}`);

      // Find the medallion
      const medallion = await this.findOne(hexId);

      // Validate availability
      if (!medallion.available) {
        throw new BadRequestException(`Medallion ${hexId} is not available for purchase`);
      }

      if (medallion.ownerAddress) {
        throw new BadRequestException(`Medallion ${hexId} is already owned`);
      }

      // Validate payment transaction ID is provided
      if (!purchaseDto.paymentTransactionId) {
        throw new BadRequestException('Payment transaction ID is required');
      }

      this.logger.debug(`Processing purchase request for medallion ${hexId} with transaction ${purchaseDto.paymentTransactionId}`);

      // Reserve the medallion by updating status
      const reservedMedallion = await this.update(hexId, {
        available: false,
        ownerAddress: purchaseDto.buyerAddress,
        purchaseTransactionId: purchaseDto.paymentTransactionId,
        purchasedAt: new Date()
      });

      // Add NFT minting job to the queue
      const job = await this.medallionQueue.add('mint-nft', {
        hexId: medallion.hexId,
        buyerAddress: purchaseDto.buyerAddress,
        transactionId: purchaseDto.paymentTransactionId,
        medallionData: {
          name: medallion.metadata?.name || `GeoMedallion ${medallion.hexId}`,
          description: medallion.metadata?.description || `Territorial access rights for hexagon ${medallion.hexId}`,
          price: medallion.price,
          center: medallion.center,
          vertices: medallion.vertices,
          attributes: medallion.metadata?.attributes || [
            { trait_type: 'Hex ID', value: medallion.hexId },
            { trait_type: 'Price', value: medallion.price },
            { trait_type: 'Center Lat', value: medallion.center.latitude },
            { trait_type: 'Center Lng', value: medallion.center.longitude }
          ]
        }
      });

      this.logger.debug(`Medallion ${hexId} reserved and NFT minting job queued with ID: ${job.id}`);

      return {
        medallion: reservedMedallion,
        status: 'reserved',
        message: `Medallion reserved successfully. NFT minting in progress.`,
        jobId: job.id.toString()
      };
    } catch (error) {
      this.logger.error(`Failed to purchase medallion ${hexId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * @method addDeviceToMedallion
   * @description Adds device data to a medallion's devices array
   * 
   * @param {string} hexId - Hex ID of the medallion
   * @param {Object} deviceData - Device data to add
   * @returns {Promise<GeoMedallion>} Updated medallion
   */
  async addDeviceToMedallion(hexId: string, deviceData: {
    deviceId: string;
    name: string;
    ownerAddress: string;
    createdAt: Date;
  }): Promise<GeoMedallion> {
    try {
      const medallion = await this.geoMedallionModel.findOneAndUpdate(
        { hexId },
        { 
          $push: { devices: deviceData },
          $set: { available: false }
        },
        { new: true }
      );

      if (!medallion) {
        throw new NotFoundException(`Geo medallion with hexId ${hexId} not found`);
      }

      this.logger.debug(`Added device ${deviceData.deviceId} to medallion ${hexId}`);
      return medallion;
    } catch (error) {
      this.logger.error(`Failed to add device to medallion ${hexId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * @method removeDeviceFromMedallion
   * @description Removes device data from a medallion's devices array
   * 
   * @param {string} hexId - Hex ID of the medallion
   * @param {string} deviceId - Device ID to remove
   * @returns {Promise<GeoMedallion>} Updated medallion
   */
  async removeDeviceFromMedallion(hexId: string, deviceId: string): Promise<GeoMedallion> {
    try {
      const medallion = await this.geoMedallionModel.findOneAndUpdate(
        { hexId },
        { 
          $pull: { 
            devices: { deviceId } 
          } 
        },
        { new: true }
      );

      if (!medallion) {
        throw new NotFoundException(`Geo medallion with hexId ${hexId} not found`);
      }

      this.logger.debug(`Removed device ${deviceId} from medallion ${hexId}`);
      return medallion;
    } catch (error) {
      this.logger.error(`Failed to remove device from medallion ${hexId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * @method getAvailableMedallions
   * @description Gets all available medallions for purchase
   * 
   * @returns {Promise<GeoMedallion[]>} Available medallions
   */
  async getAvailableMedallions(): Promise<GeoMedallion[]> {
    try {
      return await this.geoMedallionModel.find({ available: true }).sort({ price: 1 });
    } catch (error) {
      this.logger.error(`Failed to get available medallions: ${error.message}`);
      throw error;
    }
  }

  /**
   * @method getMedallionsByOwner
   * @description Gets all medallions owned by a specific address
   * 
   * @param {string} ownerAddress - Owner wallet address
   * @returns {Promise<GeoMedallion[]>} Owned medallions
   */
  async getMedallionsByOwner(ownerAddress: string): Promise<GeoMedallion[]> {
    try {
      return await this.geoMedallionModel.find({ ownerAddress }).sort({ purchasedAt: -1 });
    } catch (error) {
      this.logger.error(`Failed to get medallions for owner ${ownerAddress}: ${error.message}`);
      throw error;
    }
  }


}