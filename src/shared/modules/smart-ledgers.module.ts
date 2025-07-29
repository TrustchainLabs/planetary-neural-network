import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SmartLedgersService } from '@hsuite/smart-ledgers';
import { IClient } from '@hsuite/client-types';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SmartLedgersService,
      useFactory: (configService: ConfigService) => {
        const clientConfig = configService.getOrThrow<IClient.IOptions>('client');
        return new SmartLedgersService({ ledgers: clientConfig.ledgers });
      },
      inject: [ConfigService],
    },
  ],
  exports: [SmartLedgersService],
})
export class SmartLedgersModule {} 