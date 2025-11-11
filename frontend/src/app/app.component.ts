import { Component, OnInit } from '@angular/core';
import { AuthService } from './shared/services/auth.service';
import { WalletConnectService } from './services/wallet-connect.service';
import { LoggerUtil } from '../utils/logger/logger';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private walletConnectService: WalletConnectService
  ) {}

  async ngOnInit() {
    LoggerUtil.log('🚀 App initializing...');
    
    try {
      // Initialize WalletConnect
      await this.walletConnectService.init();
      
      // Check for existing wallet session
      const existingSession = await this.walletConnectService.checkSession();
      
      if (existingSession) {
        LoggerUtil.log('✅ Found existing wallet session, restoring...');
        const sessions = await this.walletConnectService.mapSessions();
        const selectedSession = await this.walletConnectService.getSelectedSession();
        
        if (selectedSession) {
          // Update auth service with wallet session
          this.authService.loginWithWallet(selectedSession);
          LoggerUtil.log('✅ Wallet session restored');
        }
      }
      
      // Sync auth state
      await this.authService.syncWalletSession();
      
      LoggerUtil.log('✅ App initialization complete');
    } catch (error) {
      LoggerUtil.error('❌ App initialization error:', error);
    }
  }
}
