import { Test, TestingModule } from '@nestjs/testing';
import { SmartAppController } from './smart-app.controller';
import { SmartAppService } from './smart-app.service';
import { BadRequestException } from '@nestjs/common';

describe('SmartAppController', () => {
  let smartAppController: SmartAppController;
  let smartAppService: SmartAppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SmartAppController],
      providers: [
        {
          provide: SmartAppService,
          useValue: {
            smartAppIdentifier: jest.fn()
          }
        }
      ],
    }).compile();

    smartAppController = app.get<SmartAppController>(SmartAppController);
    smartAppService = app.get<SmartAppService>(SmartAppService);
  });

  describe('smartAppIdentifier', () => {
    it('should return identifier information from the service', async () => {
      // Mock data that would be returned by the service
      const mockIdentifierData = {
        name: 'DAO App',
        version: '1.0.0',
        status: 'active',
        subscription: {
          active: true,
          expires: '2023-12-31'
        }
      };
      
      // Setup the mock implementation
      jest.spyOn(smartAppService, 'smartAppIdentifier').mockResolvedValue(mockIdentifierData);
      
      // Call the controller method
      const result = await smartAppController.smartAppIdentifier();
      
      // Verify the result matches the mock data
      expect(result).toEqual(mockIdentifierData);
      // Verify the service method was called
      expect(smartAppService.smartAppIdentifier).toHaveBeenCalled();
    });

    it('should throw BadRequestException when service throws an error', async () => {
      // Setup the mock to throw an error
      const errorMessage = 'Service error';
      jest.spyOn(smartAppService, 'smartAppIdentifier').mockRejectedValue(new Error(errorMessage));
      
      // Verify that calling the controller method throws BadRequestException
      await expect(smartAppController.smartAppIdentifier()).rejects.toThrow(BadRequestException);
      // Verify the service method was called
      expect(smartAppService.smartAppIdentifier).toHaveBeenCalled();
    });
  });
});
