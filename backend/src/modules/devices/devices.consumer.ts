import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { LoggerHelper } from '@hsuite/helpers';
import { ChainType, ILedger, SmartLedgersService } from '@hsuite/smart-ledgers';
import deviceTopicValidator from '../../shared/validators/device.topics.validator.json';
import { PrivateKey, Client, Hbar, AccountCreateTransaction } from '@hashgraph/sdk';
import { SmartConfigService } from '@hsuite/smart-config';
import { IHashgraph } from '@hsuite/hashgraph-types';
import { OnModuleInit } from '@nestjs/common';
import { ITopicCreationResult, SmartNodeCommonService } from '../smartnode-common.service';

@Processor('device')
export class DevicesConsumer implements OnModuleInit {

  private readonly logger: LoggerHelper = new LoggerHelper(DevicesConsumer.name);
  private readonly operator: IHashgraph.IOperator;
  private client: Client;
  private chain: ChainType;
  private ledger: ILedger;

  constructor(
    private readonly smartConfigService: SmartConfigService,
    private readonly smartLedgersService: SmartLedgersService,
    private readonly smartNodeCommonService: SmartNodeCommonService
  ) {
    this.operator = this.smartConfigService.getOperator();
  }

  async onModuleInit() {
    this.chain = this.smartConfigService.getChain();
    this.ledger = this.smartLedgersService.getAdapter(this.chain).getLedger();
    this.client = await this.ledger.getClient();
  }

  @Process('process-device-creation')
  async processDeviceCreation(job: Job<{ deviceId: string, ownerAddress: string }>) {
    this.logger.log(`Processing device creation for device ${job.data.deviceId}`);

    try {
        const { deviceId, ownerAddress } = job.data;

        // 1. Create the Hedera account for the device with the hedera sdk
        const ecdsaPrivateKey = PrivateKey.generateECDSA();
        const ecdsaPublicKey = ecdsaPrivateKey.publicKey;
        
        const transaction = new AccountCreateTransaction()
        .setKeyWithoutAlias(ecdsaPublicKey)
        .setInitialBalance(new Hbar(10))
        .setAccountMemo(`${deviceId}`)
        .freezeWith(this.client);

        const txResponse = await transaction.execute(this.client);
        const receipt = await txResponse.getReceipt(this.client);

        console.log('hederaAccount', receipt);

        const topicCreationResult: ITopicCreationResult = await this.smartNodeCommonService.createTopicWithValidator(deviceTopicValidator as any);

        // return all data to service save on database
        return {
          deviceId,
          ownerAddress,
          hederaAccount: receipt.accountId.toString(),
          hcsTopic: topicCreationResult.topicId,
          privateKey: ecdsaPrivateKey.toString(),
          publicKey: ecdsaPublicKey.toString(),
        };
    } catch (error) {
      this.logger.error(`Failed to process device creation for device ${job.data.deviceId}: ${error.message}`);
      throw error;
    }   
  }
} 