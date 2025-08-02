import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';
import { AxiosService } from './axios/axios.service';
import { WalletConnectService } from './wallet-connect.service';

export interface TokenGateConfig {
  tokenId: string;
  priceHbar: number;
  metadataUri: string;
  enabled: boolean;
}

export interface TokenGatePurchaseResult {
  mintTransactionId: string;
  serialNumber: number;
  tokenId: string;
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TokenGateService {
  private readonly baseUrl = environment.smartAppUrl;

  constructor(private walletConnectService: WalletConnectService) {
    // Configure AxiosService with the base URL
    AxiosService.configure(this.baseUrl);
  }

  /**
   * Get the token gate NFT ID
   * @returns Observable<string> The token gate NFT ID
   */
  getTokenGateNftId(): Observable<string> {
    return from(this.fetchTokenGateNftId());
  }

  private async fetchTokenGateNftId(): Promise<string> {
    try {
      const session = this.walletConnectService.getSelectedSession();
      const walletId = session?.wallet || 'default';

      const response = await AxiosService.get(walletId, '/token-gate/nft-id');
      return response.data.tokenId;
    } catch (error) {
      console.error('Failed to fetch token gate NFT ID:', error);
      throw new Error('Failed to fetch token gate NFT ID');
    }
  }

  /**
   * Get the token gate configuration
   * @returns Observable<TokenGateConfig> The token gate configuration
   */
  getTokenGateConfig(): Observable<TokenGateConfig> {
    return from(this.fetchTokenGateConfig());
  }

  private async fetchTokenGateConfig(): Promise<TokenGateConfig> {
    try {
      const session = this.walletConnectService.getSelectedSession();
      const walletId = session?.wallet || 'default';

      const response = await AxiosService.get(walletId, '/token-gate/config');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch token gate config:', error);
      throw new Error('Failed to fetch token gate config');
    }
  }

  /**
   * Purchase a token gate NFT
   * @param transactionId The payment transaction ID
   * @param playerAccount The player's account ID
   * @returns Observable<TokenGatePurchaseResult> The purchase result
   */
  purchaseTokenGate(transactionId: string, playerAccount: string): Observable<TokenGatePurchaseResult> {
    return from(this.processPurchase(transactionId, playerAccount));
  }

  private async processPurchase(transactionId: string, playerAccount: string): Promise<TokenGatePurchaseResult> {
    try {
      const session = this.walletConnectService.getSelectedSession();
      const walletId = session?.wallet || 'default';

      const response = await AxiosService.post(walletId, '/token-gate/purchase', {
        transactionId,
        playerAccount
      });

      return response.data;
    } catch (error) {
      console.error('Failed to purchase token gate:', error);
      throw new Error('Failed to purchase token gate');
    }
  }
}
