import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { LoggerHelper } from '@hsuite/helpers';
import { DevicesService } from './devices.service';
import { SmartNodeSdkService } from '@hsuite/smartnode-sdk';
import { ChainType, ILedger, SmartLedgersService } from '@hsuite/smart-ledgers';
import deviceTopicValidator from '../../shared/validators/device.topics.validator.json';
import { PrivateKey, Transaction, Client, Hbar, AccountCreateTransaction } from '@hashgraph/sdk';
import { SmartConfigService } from '@hsuite/smart-config';
import { IHashgraph } from '@hsuite/hashgraph-types';
import { OnModuleInit } from '@nestjs/common';

@Processor('device')
export class DevicesConsumer implements OnModuleInit {

  private readonly logger: LoggerHelper = new LoggerHelper(DevicesConsumer.name);
  private readonly operator: IHashgraph.IOperator;
  private client: Client;
  private chain: ChainType;
  private ledger: ILedger;

  constructor(
    private readonly devicesService: DevicesService,
    private readonly smartNodeSdkService: SmartNodeSdkService,
    private readonly smartConfigService: SmartConfigService,
    private readonly smartLedgersService: SmartLedgersService
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

        // 3. Create a HCS Topic for the device using the smartnodes account validator
        const topicValidatorConsensusTimestamp = await this.saveDeviceTopicValidator();
        if (!topicValidatorConsensusTimestamp) throw new Error(`Validator registration failed for device ${deviceId}`);

        console.log('topicValidatorConsensusTimestamp', topicValidatorConsensusTimestamp);
    
        // 4. Create a HCS Topic for the device using the smartnodes topic validator
        const hcsTopic = await this.smartNodeSdkService.sdk.hashgraph.hcs.createTopic({
          validatorConsensusTimestamp: topicValidatorConsensusTimestamp,
        });

        const createTopicTx = Transaction.fromBytes( new Uint8Array(Buffer.from(hcsTopic)) );
        const signedTopicTx = await createTopicTx.sign( PrivateKey.fromString(this.operator.privateKey) );
        const topicTxResponse = await signedTopicTx.execute(this.client);
        const topicReceipt = await topicTxResponse.getReceipt(this.client);

        console.log('hcsTopic', topicReceipt);
    
        // return all data to service save on database
        return {
          deviceId,
          ownerAddress,
          hederaAccount: receipt.accountId.toString(),
          hcsTopic: topicReceipt.topicId.toString(),
          privateKey: ecdsaPrivateKey.toString(),
          publicKey: ecdsaPublicKey.toString(),
        };
    } catch (error) {
      this.logger.error(`Failed to process device creation for device ${job.data.deviceId}: ${error.message}`);
      throw error;
    }   
  }

  private async saveDeviceTopicValidator(): Promise<string | null> {
    try {
        const validatorConsensusTimestamp = await this.smartNodeSdkService.sdk.smartNode.validators
        .addConsensusValidator(deviceTopicValidator as any);

        return validatorConsensusTimestamp.toString();
    } catch (error) {
      this.logger.error(`Failed to save topic validator for device: ${error.message}`);
      return null;
    }
  }
} 