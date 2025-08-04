import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  Put, 
  Query, 
  HttpCode, 
  HttpStatus, 
  BadRequestException,
  ValidationPipe 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { GeoMedallionsService, IPaginatedResult, IPurchaseResult } from './geo-medallions.service';

import { CreateGeoMedallionDto } from './dto/create-geo-medallion.dto';
import { UpdateGeoMedallionDto } from './dto/update-geo-medallion.dto';
import { ReadGeoMedallionDto } from './dto/read-geo-medallion.dto';
import { PurchaseGeoMedallionDto } from './dto/purchase-geo-medallion.dto';
import { GeoMedallion } from './entities/geo-medallion.entity';

/**
 * @class GeoMedallionsController
 * @description REST API controller for managing geo medallions
 * 
 * This controller provides endpoints for managing geographic medallions,
 * which are hexagonal NFT territories that grant access rights for IoT
 * device placement. Users can query, purchase, and manage medallions.
 */
@ApiTags('geo-medallions')
@Controller('geo-medallions')
export class GeoMedallionsController {
  constructor(private readonly geoMedallionsService: GeoMedallionsService) {}

  /**
   * @method create
   * @description Creates a new geo medallion
   * 
   * @param {CreateGeoMedallionDto} createGeoMedallionDto - Medallion creation data
   * @returns {Promise<GeoMedallion>} Created medallion
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new geo medallion' })
  @ApiResponse({ 
    status: 201, 
    description: 'The geo medallion has been successfully created.', 
    type: GeoMedallion 
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 409, description: 'Medallion with this hex ID already exists.' })
  async create(@Body(new ValidationPipe()) createGeoMedallionDto: CreateGeoMedallionDto): Promise<GeoMedallion> {
    try {
      return await this.geoMedallionsService.create(createGeoMedallionDto);
    } catch (error) {
      throw new BadRequestException({
        message: 'Failed to create geo medallion',
        details: error.message,
        errors: error.errors
      });
    }
  }





  /**
   * @method findAll
   * @description Retrieves geo medallions with filtering and pagination
   * 
   * @param {ReadGeoMedallionDto} query - Query parameters
   * @returns {Promise<IPaginatedResult<GeoMedallion>>} Paginated medallions
   */
  @Get()
  @ApiOperation({ summary: 'Retrieve geo medallions with filtering and pagination' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of geo medallions.',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/GeoMedallion' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' }
      }
    }
  })
  @ApiQuery({ name: 'available', required: false, type: Boolean, description: 'Filter by availability' })
  @ApiQuery({ name: 'ownerAddress', required: false, type: String, description: 'Filter by owner address' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter' })
  @ApiQuery({ name: 'centerLat', required: false, type: Number, description: 'Center latitude for geographic search' })
  @ApiQuery({ name: 'centerLng', required: false, type: Number, description: 'Center longitude for geographic search' })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number, description: 'Search radius in kilometers' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAll(@Query() query: ReadGeoMedallionDto): Promise<IPaginatedResult<GeoMedallion>> {
    try {
      return await this.geoMedallionsService.findAll(query);
    } catch (error) {
      throw new BadRequestException({
        message: 'Failed to retrieve geo medallions',
        details: error.message,
        errors: error.errors
      });
    }
  }

  /**
   * @method getAvailable
   * @description Gets all available medallions for purchase
   * 
   * @returns {Promise<GeoMedallion[]>} Available medallions
   */
  @Get('available')
  @ApiOperation({ summary: 'Get all available geo medallions for purchase' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of available geo medallions.', 
    type: [GeoMedallion] 
  })
  async getAvailable(): Promise<GeoMedallion[]> {
    try {
      return await this.geoMedallionsService.getAvailableMedallions();
    } catch (error) {
      throw new BadRequestException({
        message: 'Failed to retrieve available medallions',
        details: error.message,
        errors: error.errors
      });
    }
  }

  /**
   * @method getMedallionsByOwner
   * @description Gets all medallions owned by a specific address
   * 
   * @param {string} ownerAddress - Owner wallet address
   * @returns {Promise<GeoMedallion[]>} Owned medallions
   */
  @Get('owner/:ownerAddress')
  @ApiOperation({ summary: 'Get geo medallions by owner address' })
  @ApiParam({ name: 'ownerAddress', description: 'Owner wallet address', example: '0.0.12345' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of medallions owned by the address.', 
    type: [GeoMedallion] 
  })
  async getMedallionsByOwner(@Param('ownerAddress') ownerAddress: string): Promise<GeoMedallion[]> {
    try {
      return await this.geoMedallionsService.getMedallionsByOwner(ownerAddress);
    } catch (error) {
      throw new BadRequestException({
        message: 'Failed to retrieve medallions by owner',
        details: error.message,
        errors: error.errors
      });
    }
  }

  /**
   * @method findOne
   * @description Retrieves a specific geo medallion by hex ID
   * 
   * @param {string} hexId - Hex ID of the medallion
   * @returns {Promise<GeoMedallion>} The medallion
   */
  @Get(':hexId')
  @ApiOperation({ summary: 'Retrieve a specific geo medallion by hex ID' })
  @ApiParam({ name: 'hexId', description: 'Hexagon identifier', example: 'hex_nyc_001' })
  @ApiResponse({ 
    status: 200, 
    description: 'The geo medallion details.', 
    type: GeoMedallion 
  })
  @ApiResponse({ status: 404, description: 'Geo medallion not found.' })
  async findOne(@Param('hexId') hexId: string): Promise<GeoMedallion> {
    try {
      return await this.geoMedallionsService.findOne(hexId);
    } catch (error) {
      throw new BadRequestException({
        message: 'Failed to retrieve geo medallion',
        details: error.message,
        errors: error.errors
      });
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
  @Put(':hexId')
  @ApiOperation({ summary: 'Update a geo medallion' })
  @ApiParam({ name: 'hexId', description: 'Hexagon identifier', example: 'hex_nyc_001' })
  @ApiResponse({ 
    status: 200, 
    description: 'The geo medallion has been successfully updated.', 
    type: GeoMedallion 
  })
  @ApiResponse({ status: 404, description: 'Geo medallion not found.' })
  async update(
    @Param('hexId') hexId: string,
    @Body(new ValidationPipe()) updateGeoMedallionDto: UpdateGeoMedallionDto
  ): Promise<GeoMedallion> {
    try {
      return await this.geoMedallionsService.update(hexId, updateGeoMedallionDto);
    } catch (error) {
      throw new BadRequestException({
        message: 'Failed to update geo medallion',
        details: error.message,
        errors: error.errors
      });
    }
  }



  /**
   * @method purchase
   * @description Purchases a geo medallion and mints NFT
   * 
   * This endpoint handles the complete purchase flow including payment
   * verification and NFT minting.
   * 
   * @param {string} hexId - Hex ID of the medallion to purchase
   * @param {PurchaseGeoMedallionDto} purchaseDto - Purchase data
   * @returns {Promise<IPurchaseResult>} Purchase result with NFT details
   */
  @Post(':hexId/buy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Purchase a geo medallion',
    description: 'Purchases a medallion, verifies payment, and mints NFT representing ownership'
  })
  @ApiParam({ name: 'hexId', description: 'Hexagon identifier to purchase', example: 'hex_nyc_001' })
  @ApiResponse({ 
    status: 200, 
    description: 'Medallion purchased successfully and NFT minted.',
    schema: {
      type: 'object',
      properties: {
        medallion: { $ref: '#/components/schemas/GeoMedallion' },
        nftTokenId: { type: 'string' },
        transactionId: { type: 'string' },
        consensusTimestamp: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Medallion not available or payment verification failed.' })
  @ApiResponse({ status: 404, description: 'Medallion not found.' })
  async purchase(
    @Param('hexId') hexId: string,
    @Body(new ValidationPipe()) purchaseDto: PurchaseGeoMedallionDto
  ): Promise<IPurchaseResult> {
    try {
      return await this.geoMedallionsService.purchase(hexId, purchaseDto);
    } catch (error) {
      throw new BadRequestException({
        message: 'Failed to purchase geo medallion',
        details: error.message,
        errors: error.errors
      });
    }
  }
}