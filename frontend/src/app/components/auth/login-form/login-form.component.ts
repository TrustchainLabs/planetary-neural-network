import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { AuthService } from '../../../shared/services/auth.service';
import { WalletsModalComponent } from '../../wallets-modal/wallets-modal.component';

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

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    // No form needed for wallet connect
  }

  async connectWallet() {
    const modal = await this.modalController.create({
      component: WalletsModalComponent,
      cssClass: 'wallets-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data && result.data.wallet) {
        this.handleWalletConnection(result.data.wallet);
      }
    });

    return await modal.present();
  }

  async handleWalletConnection(walletType: string) {
    this.isLoading = true;
    try {
      // Simulate wallet connection
      const walletUser = {
        accessToken: `wallet_token_${Date.now()}`,
        operator: { _id: 'wallet_op', name: 'Wallet User', email: 'wallet@user.com' },
        user: { _id: 'wallet_user', email: 'wallet@user.com', username: 'Wallet User', wallet: walletType }
      };

      localStorage.setItem('accessToken', walletUser.accessToken);
      localStorage.setItem('operator', JSON.stringify(walletUser.operator));
      localStorage.setItem('user', JSON.stringify(walletUser.user));
      localStorage.setItem('walletType', walletType);

      this.router.navigate(['/dashboard']);
    } catch (e) {
      console.error(e);
      const toast = await this.toastController.create({
        message: 'Wallet connection failed. Please try again.',
        duration: 3000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    } finally {
      this.isLoading = false;
    }
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
