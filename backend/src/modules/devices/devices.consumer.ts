import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { LoggerHelper } from '@hsuite/helpers';
import { ChainType, ILedger, SmartLedgersService } from '@hsuite/smart-ledgers';
import deviceTopicValidator from '../../shared/validators/device.topics.validator.json';
import { PrivateKey, Client, Hbar, AccountCreateTransaction, TokenAssociateTransaction, TokenId, TokenMintTransaction, TransferTransaction } from '@hashgraph/sdk';
import { SmartConfigService } from '@hsuite/smart-config';
import { IHashgraph } from '@hsuite/hashgraph-types';
import { OnModuleInit } from '@nestjs/common';
import { ITopicCreationResult, SmartNodeCommonService } from '../smartnode-common.service';

@Processor('device')
export class DevicesConsumer implements OnModuleInit {

  private readonly logger: LoggerHelper = new LoggerHelper(DevicesConsumer.name, true);
  private readonly operator: IHashgraph.IOperator;
  private client: Client;
  private chain: ChainType;
  private ledger: ILedger;

  constructor(
    private readonly smartConfigService: SmartConfigService,
    private readonly smartLedgersService: SmartLedgersService,
    private readonly smartNodeCommonService: SmartNodeCommonService,
  ) {
    this.operator = this.smartConfigService.getOperator();
  }

  async onModuleInit() {
    this.chain = this.smartConfigService.getChain();
    this.ledger = this.smartLedgersService.getAdapter(this.chain).getLedger();
    this.client = await this.ledger.getClient();
  }

  @Process('process-device-creation')
  async processDeviceCreation(job: Job<{ deviceId: string, ownerAddress: string, smartDevicesConfig: any, rewardTokenId: string }>) {
    this.logger.log(`Starting device creation process for device ${job.data.deviceId} with owner ${job.data.ownerAddress}`);

    try {
        const { deviceId, ownerAddress, rewardTokenId } = job.data;
        const { collection_id, nft_metadata_cid } = job.data.smartDevicesConfig;

        this.logger.log(`Device creation parameters - DeviceId: ${deviceId}, Owner: ${ownerAddress}, Collection: ${collection_id}, Metadata CID: ${nft_metadata_cid}`);

        // 1. Create the Hedera account for the device with the hedera sdk
        this.logger.log(`Step 1: Generating ECDSA keypair for device ${deviceId}`);
        const ecdsaPrivateKey = PrivateKey.generateECDSA();
        const ecdsaPublicKey = ecdsaPrivateKey.publicKey;
        this.logger.log(`ECDSA keypair generated successfully for device ${deviceId}`);
        
        this.logger.log(`Step 2: Creating Hedera account for device ${deviceId}`);
        const transaction = new AccountCreateTransaction()
        .setKeyWithoutAlias(ecdsaPublicKey)
        .setInitialBalance(new Hbar(10))
        .setAccountMemo(`${deviceId}`)
        .freezeWith(this.client);

        this.logger.log(`Executing account creation transaction for device ${deviceId}`);
        const txResponse = await transaction.execute(this.client);
        const receipt = await txResponse.getReceipt(this.client);

        this.logger.log(`Hedera account created successfully for device ${deviceId}: ${receipt.accountId.toString()}`);

        // associate account with token collection and reward token
        this.logger.log(`Step 3: Associating account ${receipt.accountId.toString()} with token collection ${collection_id}`);
        const tokenAssociateTransaction = new TokenAssociateTransaction()
        .setAccountId(receipt.accountId.toString())
        .setTokenIds([collection_id, rewardTokenId])
        .freezeWith(this.client);
        
        const signTokenAssociateTx = await tokenAssociateTransaction.sign(PrivateKey.fromString(ecdsaPrivateKey.toString()));
        this.logger.log(`Executing token association transaction for device ${deviceId}`);
        const tokenAssociateTxResponse = await signTokenAssociateTx.execute(this.client);
        const tokenAssociateReceipt = await tokenAssociateTxResponse.getReceipt(this.client);
        
        this.logger.log(`Token association completed successfully for device ${deviceId}`);

        // mint smart device nft
        this.logger.log(`Step 4: Minting NFT for device ${deviceId} in collection ${collection_id}`);
        const mintTransaction = new TokenMintTransaction()
        .setTokenId(collection_id)
        .setMetadata([Buffer.from(nft_metadata_cid)])
        .freezeWith(this.client);

        const signMintTx = await mintTransaction.sign(PrivateKey.fromString(this.operator.privateKey));
        this.logger.log(`Executing NFT mint transaction for device ${deviceId}`);
        const mintTxResponse = await signMintTx.execute(this.client);
        const mintReceipt = await mintTxResponse.getReceipt(this.client);

        this.logger.log(`NFT minted successfully for device ${deviceId}: Collection ${collection_id}, Serial ${mintReceipt.serials[0]}`);

        // Send NFT to owner
        this.logger.log(`Step 5: Transferring NFT to ${receipt.accountId.toString()} device ${deviceId}`);
        const sendTransaction = new TransferTransaction()
        .addNftTransfer(collection_id, mintReceipt.serials[0].toString(), this.operator.accountId.toString(), receipt.accountId.toString())
        .freezeWith(this.client);

        const signSendTx = await sendTransaction.sign(PrivateKey.fromString(this.operator.privateKey));
        this.logger.log(`Executing NFT transfer transaction for device ${deviceId}`);
        const sendTxResponse = await signSendTx.execute(this.client);
        const sendReceipt = await sendTxResponse.getReceipt(this.client);

        this.logger.log(`NFT transferred successfully to owner ${receipt.accountId.toString()} for device ${deviceId}`);
        
        // create hcs topic
        this.logger.log(`Step 6: Creating HCS topic for device ${deviceId}`);
        const topicCreationResult: ITopicCreationResult = await this.smartNodeCommonService.createTopicWithValidator(deviceTopicValidator as any);
        this.logger.log(`HCS topic created successfully for device ${deviceId}: ${topicCreationResult.topicId}`);

        const result = {
          deviceId,
          ownerAddress,
          hederaAccount: receipt.accountId.toString(),
          hcsTopic: topicCreationResult.topicId,
          privateKey: ecdsaPrivateKey.toString(),
          publicKey: ecdsaPublicKey.toString(),
        };

        this.logger.log(`Device creation process completed successfully for device ${deviceId}`);
        this.logger.log(`Final result: ${JSON.stringify(result, null, 2)}`);

        // return all data to service save on database
        return result;
    } catch (error) {
      this.logger.error(`Failed to process device creation for device ${job.data.deviceId}: ${error.message}`);
      this.logger.error(`Error stack trace: ${error.stack}`);
      
      // Throw a more descriptive error with context
      throw new Error(`Device creation failed for device ${job.data.deviceId}: ${error.message}`);
    }   
  }
} 