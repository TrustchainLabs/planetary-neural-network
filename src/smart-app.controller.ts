/**
 * @module SmartAppController
 * @description Main controller for the DAO application
 * 
 * This controller handles the core API endpoints for the DAO application,
 * including system information and identification endpoints.
 */
import { BadRequestException, Controller, Get } from '@nestjs/common';
import { SmartAppService } from './smart-app.service';
import { ApiNotFoundResponse, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@hsuite/nestjs-swagger';
import { Public } from '@hsuite/auth-types';

/**
 * @class SmartAppController
 * @description Main controller for the DAO application
 * 
 * The SmartAppController provides endpoints for retrieving information about the
 * application, including identification and status information. The controller
 * is marked as public, meaning its endpoints don't require authentication.
 */
@Controller('smart-app')
@ApiTags('smart-app')
@Public()
export class SmartAppController {
  /**
   * @constructor
   * @param {SmartAppService} smartAppService - Service for handling smart app operations
   */
  constructor(
    private readonly smartAppService: SmartAppService
  ) {}

  /**
   * @method smartAppIdentifier
   * @description Retrieves the application identifier information
   * 
   * This endpoint returns identification information for the smart application,
   * including version, environment, and other relevant details. It uses the
   * SmartAppService to gather the application identifier information.
   * 
   * @returns {Promise<any>} Application identifier information
   * @throws {BadRequestException} If there is an error retrieving the identifier
   */
  @ApiOperation({
    summary: 'get subscription status for the logged in user.',
    description: 'This endpoint is only available if the user is authenticated. \
    It will return the subscription details.'
  })
  @ApiOkResponse({
    type: Object,
    status: 200,
    description: "Returns an Object."
  })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()  
  @Get('identifier')
  async smartAppIdentifier(): Promise<any> {
    try {
      return await this.smartAppService.smartAppIdentifier();
    } catch(error) {
      throw new BadRequestException(error.message);
    }
  }
}
