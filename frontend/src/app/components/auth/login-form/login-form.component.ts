import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, ToastController, ModalController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../../shared/services/auth.service';
import { WalletsModalComponent } from '../../wallets-modal/wallets-modal.component';
import { WalletConnectService, WC_Session } from '../../../services/wallet-connect.service';
import { base64StringToSignatureMap } from '@kabila-tech/hedera-wallet-connect';
import { LoggerUtil } from '../../../../utils/logger/logger';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonicModule
  ],
  template: `
    <div class="container">
      <div class="title">
        <img
          src="assets/images/brand-logo.svg"
          alt="Brand Logo"
          width="32"
          height="32"
        />
        <img
          src="assets/images/brand-title.svg"
          alt="Brand Title"
          width="240"
          height="40"
        />
      </div>

      <div class="wallet-connect">
        <div class="welcome-text">
          <h2>Connect Your Wallet</h2>
          <p>Access the hexagonal NFT climate network with your preferred wallet</p>
        </div>

        <ion-button
          expand="block"
          (click)="connectWallet()"
          [disabled]="isLoading"
          class="connect-button"
        >
          <ion-icon name="wallet-outline" slot="start"></ion-icon>
          <ion-spinner *ngIf="isLoading" name="crescent"></ion-spinner>
          <span *ngIf="!isLoading">Connect Wallet</span>
        </ion-button>

        <div class="info-text">
          <p>Connect your wallet to:</p>
          <ul>
            <li>Purchase hexagonal area NFTs</li>
            <li>Deploy climate monitoring devices</li>
            <li>Earn rewards from data collection</li>
            <li>Rent space to other device owners</li>
          </ul>
        </div>
      </div>

      <div class="guest-login">
        <ion-button
          fill="outline"
          expand="block"
          (click)="loginAsGuest()"
          [disabled]="isLoading"
          class="guest-button"
        >
          Continue as Guest
        </ion-button>
      </div>
    </div>
  `,
  styleUrls: ['./login-form.component.scss']
})
export class LoginFormComponent implements OnInit {
  isLoading = false;
  private loading: HTMLIonLoadingElement | undefined;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private walletConnectService: WalletConnectService
  ) {}

  async ngOnInit() {
    // Initialize WalletConnect
    LoggerUtil.log('🔌 Initializing WalletConnect on login page...');
    await this.walletConnectService.init();
    
    // Check for existing session
    const existingSession = await this.walletConnectService.checkSession();
    if (existingSession) {
      LoggerUtil.log('✅ Found existing wallet session, redirecting to dashboard...');
      this.router.navigate(['/dashboard']);
    }
  }

  async connectWallet() {
    const modal = await this.modalController.create({
      component: WalletsModalComponent,
      cssClass: 'hsuite-modal',
      componentProps: {
        walletExtensions: this.walletConnectService.walletExtensions
      }
    });

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      try {
        this.isLoading = true;
        
        switch (data.name) {
          case 'walletconnect':
            await this.walletConnectService.connect();
            break;
          default:
            await this.walletConnectService.connectExtension(data.id);
            break;
        }

        // Wait for session to be established
        await this.waitForSessionAndAuthenticate();
        
      } catch (error: any) {
        LoggerUtil.error('❌ Wallet connection error:', error);
        await this.showToast(error.message || 'Wallet connection failed. Please try again.', 'danger');
        this.isLoading = false;
      }
    }
  }

  private async waitForSessionAndAuthenticate() {
    // Listen for session connection
    const subscription = this.walletConnectService.eventsObserver.subscribe(async (event: any) => {
      LoggerUtil.log('📡 Wallet event received:', event);
      
      switch (event.type) {
        case 'session_connect':
          LoggerUtil.log('🤝 Session connected, starting authentication...');
          const session = await this.walletConnectService.getSelectedSession();
          if (session) {
            await this.authenticateSession(session);
          }
          subscription.unsubscribe();
          break;
          
        case 'error':
          LoggerUtil.error('❌ Wallet error:', event.content);
          await this.showToast(event.content.message, 'danger');
          this.isLoading = false;
          subscription.unsubscribe();
          break;
      }
    });
  }

  private async authenticateSession(session: WC_Session) {
    try {
      LoggerUtil.log('🚀 Starting authentication flow for session:', session);
      await this.showLoading('Requesting authentication challenge...');

      // Get the challenge payload that needs to be signed
      const challenge = await this.walletConnectService.requestAuthChallenge();
      await this.hideLoading();

      await this.showLoading('Please sign the message with your wallet...');

      const payload = {
        serverSignature: challenge.signedData.signature,
        originalPayload: challenge.payload
      };

      const signedMessage = await this.walletConnectService.hederaSignMessage(
        session,
        JSON.stringify(payload)
      );
      
      const signatureMap = base64StringToSignatureMap(signedMessage.signatureMap);

      const signedData = {
        signedPayload: this.walletConnectService.prefixMessageToSign(JSON.stringify(payload)),
        userSignature: <Uint8Array>signatureMap.sigPair[0].ed25519 || signatureMap.sigPair[0].ECDSASecp256k1
      };

      await this.hideLoading();

      if (signedMessage) {
        await this.showLoading('Authenticating...');

        const loginResult = await this.walletConnectService.login(signedData, session);
        LoggerUtil.log('✅ Login successful:', loginResult);

        // Update AuthService state
        this.authService.loginWithWallet(session);

        await this.hideLoading();
        await this.showToast('Successfully connected wallet!', 'success');

        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      } else {
        await this.hideLoading();
        await this.showToast('Failed to verify wallet signature', 'danger');
        this.isLoading = false;
      }
    } catch (error: any) {
      LoggerUtil.error('💥 Authentication error:', error);
      await this.hideLoading();
      await this.showToast(
        error.message || 'Failed to authenticate wallet',
        'danger'
      );
      this.isLoading = false;
    }
  }

  private async showLoading(message: string) {
    this.loading = await this.loadingController.create({ message });
    await this.loading.present();
  }

  private async hideLoading() {
    if (this.loading) {
      await this.loading.dismiss();
      this.loading = undefined;
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  async loginAsGuest() {
    this.isLoading = true;
    try {
      // Create guest session
      const guestUser = {
        accessToken: 'guest_token_' + Date.now(),
        operator: { _id: 'guest_op', name: 'Guest Operator', email: 'guest@ecosphere.com' },
        user: { _id: 'guest_user', email: 'guest@ecosphere.com', username: 'Guest User' }
      };

      localStorage.setItem('accessToken', guestUser.accessToken);
      localStorage.setItem('operator', JSON.stringify(guestUser.operator));
      localStorage.setItem('user', JSON.stringify(guestUser.user));
      localStorage.setItem('isGuest', 'true');

      this.router.navigate(['/dashboard']);
    } catch (e) {
      console.error(e);
      const toast = await this.toastController.create({
        message: 'Guest login failed. Please try again.',
        duration: 3000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    } finally {
      this.isLoading = false;
    }
  }
}
