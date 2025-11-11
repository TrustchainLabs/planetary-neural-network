import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { WalletConnectService } from '../../../services/wallet-connect.service';

@Component({
  selector: 'app-user-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div
      class="container wallet-button"
      [ngClass]="className"
      (click)="handleClick()"
    >
      <div class="wallet-icon">
        <ion-icon [name]="isConnected ? 'person-circle' : 'wallet-outline'" size="large"></ion-icon>
      </div>
      <div *ngIf="isConnected && walletAddress" class="wallet-info">
        <span class="wallet-address">{{ truncateAddress(walletAddress) }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./user-tab.component.scss']
})
export class UserTabComponent implements OnInit {
  @Input() className: string = '';
  isConnected: boolean = false;
  walletAddress: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private walletConnectService: WalletConnectService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.updateWalletStatus();
    
    // Listen to auth changes
    this.authService.isLoggedIn$.subscribe(() => {
      this.updateWalletStatus();
    });
  }

  private updateWalletStatus() {
    this.isConnected = this.authService.isAuthenticated();
    this.walletAddress = this.authService.getUserWallet();
  }

  async handleClick() {
    if (this.isConnected) {
      await this.showUserMenu();
    } else {
      this.router.navigate(['/login']);
    }
  }

  async showUserMenu() {
    const alert = await this.alertController.create({
      header: 'Account',
      subHeader: this.walletAddress ? `Wallet: ${this.truncateAddress(this.walletAddress)}` : 'User Account',
      message: 'What would you like to do?',
      buttons: [
        {
          text: 'Logout',
          role: 'destructive',
          handler: () => {
            this.logout();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  async logout() {
    // Disconnect wallet if connected
    if (this.authService.isWalletAuthenticated()) {
      await this.walletConnectService.disconnectAll();
    }
    
    // Clear auth state
    this.authService.clearAuthState();
    
    // Navigate to login
    this.router.navigate(['/login']);
  }

  truncateAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}
