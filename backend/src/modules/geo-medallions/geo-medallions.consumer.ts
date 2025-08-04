import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bull';
import { LoggerHelper } from '@hsuite/helpers';
import { GeoMedallion } from './entities/geo-medallion.entity';
import { Config } from '../config/entities/config.entity';
import { SmartNodeCommonService } from '../smartnode-common.service';
import { PrivateKey, TokenMintTransaction } from '@hashgraph/sdk';

/**
 * @interface IMintNftJobData
 * @description Job data for NFT minting
 */
export interface IMintNftJobData {
  hexId: string;
  buyerAddress: string;
  transactionId: string;
  medallionData: {
    name: string;
    description: string;
    price: number;
    center: {
      latitude: number;
      longitude: number;
    };
    vertices: Array<{
      latitude: number;
      longitude: number;
    }>;
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}

/**
 * @class GeoMedallionsConsumer
 * @description Bull queue consumer for processing geo medallion NFT minting
 * 
 * This consumer handles the asynchronous NFT minting process after a medallion
 * purchase request has been validated and reserved. It mints NFTs using the
 * Hedera SDK from a pre-configured collection.
 */
@Injectable()
@Processor('geo-medallions')
export class GeoMedallionsConsumer {
  private readonly logger: LoggerHelper = new LoggerHelper(GeoMedallionsConsumer.name);

  constructor(
    @InjectModel(GeoMedallion.name) private geoMedallionModel: Model<GeoMedallion>,
    @InjectModel(Config.name) private configModel: Model<Config>,
    private readonly smartNodeCommonService: SmartNodeCommonService
  ) {}

  /**
   * @method mintNft
   * @description Processes NFT minting job
   * 
   * This method:
   * 1. Retrieves collection configuration from database
   * 2. Prepares NFT metadata using IPFS
   * 3. Mints NFT using Hedera SDK
   * 4. Updates medallion with NFT details
   * 
   * @param {Job<IMintNftJobData>} job - Bull job containing minting data
   */
  @Process('mint-nft')
  async mintNft(job: Job<IMintNftJobData>) {
    const { hexId, buyerAddress, transactionId, medallionData } = job.data;
    
    this.logger.debug(`Processing NFT minting job for medallion: ${hexId}`);

    try {
      // Get collection configuration from database
      const config = await this.configModel.findOne({ 
        'geo_medallions_config': { $exists: true }
      });

      if (!config || !config.geo_medallions_config) {
        throw new Error('Geo medallions collection configuration not found in database');
      }

      const { collection_id, nft_metadata_cid } = config.geo_medallions_config;
      
      this.logger.debug(`Using collection: ${collection_id}, metadata CID: ${nft_metadata_cid}`);

      this.logger.debug(`Minting NFT for medallion ${hexId} to address ${buyerAddress}`);

      // Mint NFT with hedera sdk
      const mintTransaction = new TokenMintTransaction()
        .setTokenId(collection_id)
        .setMetadata([Buffer.from(nft_metadata_cid)])
        .freezeWith(this.smartNodeCommonService.getClient());

        const signTx = await mintTransaction.sign(PrivateKey.fromString(this.smartNodeCommonService.getOperator().privateKey));
        const txResponse = await signTx.execute(this.smartNodeCommonService.getClient());
        const receipt = await txResponse.getReceipt(this.smartNodeCommonService.getClient());

      this.logger.debug(`NFT minted successfully: ${collection_id}:${receipt.serials}`);

      // Update medallion with NFT details
      await this.geoMedallionModel.findOneAndUpdate(
        { hexId: hexId },
        {
          nftTokenId: collection_id+":"+receipt.serials,
          mintTransactionId: txResponse.transactionId.toString(),
          mintedAt: new Date(),
          $unset: { purchaseTransactionId: '' }
        }
      );

      this.logger.debug(`Medallion ${hexId} updated with NFT details`);

      // Mark job as completed with success details
      job.progress(100);
      
      return {
        success: true,
        nftTokenId: collection_id+":"+receipt.serials,
        transactionId: txResponse.transactionId.toString(),
        message: `NFT minted successfully for medallion ${hexId}`
      };

    } catch (error) {
      this.logger.error(`Failed to mint NFT for medallion ${hexId}: ${error.message}`);

      // Update medallion status to indicate minting failure
      await this.geoMedallionModel.findOneAndUpdate(
        { hexId: hexId },
        {
          available: true, // Make available again for retry
          $unset: { 
            ownerAddress: '',
            purchaseTransactionId: '',
            purchasedAt: ''
          }
        }
      );

      // Re-throw error to mark job as failed
      throw new Error(`NFT minting failed for medallion ${hexId}: ${error.message}`);
    }
  }


}