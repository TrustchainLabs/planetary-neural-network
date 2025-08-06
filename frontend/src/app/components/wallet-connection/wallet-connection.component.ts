import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { WalletConnectService, WC_Session } from '../../services/wallet-connect.service';
import { WalletsModalComponent } from '../wallets-modal/wallets-modal.component';
import { WalletsSessionsComponent } from '../sessions-modal/sessions-modal.component';
import { base64StringToSignatureMap } from '@kabila-tech/hedera-wallet-connect';
import * as lodash from 'lodash';
import { CustomModalService } from '../../services/custom-modal.service';
import { AxiosService } from '../../services/axios/axios.service';
import { LoggerUtil } from '../../../utils/logger/logger';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  selector: 'app-wallet-connection',
  templateUrl: './wallet-connection.component.html',
  styleUrls: ['./wallet-connection.component.scss']
})
export class WalletConnectionComponent implements OnInit {
  public sessions: WC_Session[] = [];
  public selectedSession: WC_Session | undefined = undefined;
  private loading: HTMLIonLoadingElement | undefined;

  constructor(
    private loadingController: LoadingController,
    private toastController: ToastController,
    private customModalService: CustomModalService,
    private walletConnectService: WalletConnectService,
    private modalController: ModalController
  ) {}

  async ngOnInit() {
    LoggerUtil.log('🔌 Initializing WalletConnect...');
    await this.walletConnectService.init();

    // Check for existing session on init
    LoggerUtil.log('🔍 Checking for existing session...');
    const existingSession = await this.walletConnectService.checkSession();
    LoggerUtil.log('💾 Existing session:', existingSession);

    if (existingSession) {
      LoggerUtil.log('🔄 Restoring existing session...');
      this.sessions = await this.walletConnectService.mapSessions();
      this.selectedSession = await this.walletConnectService.getSelectedSession();
      LoggerUtil.log('📱 Restored session state:', {
        sessions: this.sessions,
        selectedSession: this.selectedSession
      });

      this.walletConnectService.triggerEvent({
        type: 'session_select',
        payload: this.selectedSession,
        content: {
          message: 'Selected Session',
          type: 'success'
        }
      });
    }

    this.walletConnectService.eventsObserver.subscribe(async (event: any) => {
      LoggerUtil.log('📡 Received wallet event:', event);
      switch (event.type) {
        case 'error':
          LoggerUtil.error('❌ Wallet error:', event.content);
          await this.hideLoading();
          await this.showToast(event.content.message, 'bottom');
          break;
        case 'connect':
        case 'disconnect':
          LoggerUtil.log('🔌 Wallet connection event:', event.content);
          await this.showToast(event.content.message, 'top');
          break;
        case 'session_connect':
          LoggerUtil.log('🤝 New session connected:', event.content);
          await this.showToast(event.content.message, 'bottom');
          this.sessions = await this.walletConnectService.mapSessions();
          this.selectedSession = await this.walletConnectService.getSelectedSession();
          LoggerUtil.log('📱 Updated sessions after connect:', {
            sessions: this.sessions,
            selectedSession: this.selectedSession
          });
          if (this.selectedSession) {
            await this.authenticateSession(this.selectedSession);
          }
          break;
        case 'session_disconnect':
        case 'session_disconnect_all':
        case 'session_delete':
          LoggerUtil.log('👋 Session ended:', event.content);
          await this.showToast(event.content.message, 'bottom');
          this.sessions = await this.walletConnectService.mapSessions();
          this.selectedSession = await this.walletConnectService.getSelectedSession();
          LoggerUtil.log('📱 Updated sessions after disconnect:', {
            sessions: this.sessions,
            selectedSession: this.selectedSession
          });
          break;
      }
    });
  }

  async sessionsModal() {
    const modal = await this.modalController.create({
      component: WalletsSessionsComponent,
      cssClass: 'hsuite-modal',
      componentProps: {
        sessions: this.sessions,
        selectedSession: this.selectedSession
      }
    });

    modal.present();

    const { data, role } = await modal.onWillDismiss();

    switch (role) {
      case 'confirm':
        LoggerUtil.log('🔍 DEBUG - Wallet selection confirmed:', data);
        this.walletConnectService.selectSession(data);
        this.selectedSession = data;

        // Verify if we have a session cookie for this wallet
        const sessionCookie = AxiosService.getSessionCookie(data.wallet);
        LoggerUtil.log(`🔍 DEBUG - Session cookie for selected wallet ${data.wallet}: ${sessionCookie || 'undefined'}`);

        // If no session cookie is found, we may need to authenticate
        if (!sessionCookie) {
          LoggerUtil.log(`🔍 DEBUG - No session cookie found for wallet ${data.wallet}, may need authentication`);
          const shouldAuth = await this.showConfirmation(
            'Authentication Required',
            'It appears you need to authenticate this wallet. Would you like to authenticate now?'
          );

          if (shouldAuth) {
            await this.authenticateSession(this.selectedSession);
          }
        }

        this.walletConnectService.triggerEvent({
          type: 'session_select',
          payload: this.selectedSession,
          content: {
            message: 'Selected Session',
            type: 'success'
          }
        });
        break;
      case 'add':
        await this.selectWallet();
        break;
      case 'logout':
        await this.walletConnectService.disconnect(data.topic);
        await this.walletConnectService.logout();

        let selectedSession = await this.walletConnectService.getSelectedSession();
        if (selectedSession.topic == data.topic) {
          let sessions = this.walletConnectService.mapSessions();

          this.walletConnectService.selectSession(lodash.first(sessions));
          this.selectedSession = lodash.first(sessions);

          if (this.selectedSession) {
            await this.authenticateSession(this.selectedSession);
          }
        }
        break;
    }
  }

  private async authenticateSession(session: WC_Session) {
    try {
      LoggerUtil.log('🚀 Starting authentication flow for session:', session);
      await this.showLoading('Requesting authentication challenge...');

      // Get the challenge payload that needs to be signed
      const challenge = await this.walletConnectService.requestAuthChallenge();

      await this.hideLoading();

      await this.showLoading('Please sign the message with your wallet...');

      let payload = {
        serverSignature: challenge.signedData.signature,
        originalPayload: challenge.payload
      };

      let signedMessage = await this.walletConnectService.hederaSignMessage(session, JSON.stringify(payload));
      let signatureMap = base64StringToSignatureMap(signedMessage.signatureMap);

      let signedData = {
        signedPayload: this.walletConnectService.prefixMessageToSign(JSON.stringify(payload)),
        userSignature: <Uint8Array> signatureMap.sigPair[0].ed25519 || signatureMap.sigPair[0].ECDSASecp256k1
      };

      await this.hideLoading();

      if (signedMessage) {
        await this.showLoading('Authenticating...');

        const loginResult = await this.walletConnectService.login(signedData, session);

        LoggerUtil.log(loginResult);

        await this.hideLoading();
        await this.showToast('Successfully authenticated with wallet', 'bottom');

        this.sessions = await this.walletConnectService.mapSessions();
        this.selectedSession = await this.walletConnectService.getSelectedSession();
      } else {
        await this.hideLoading();
        await this.showToast('Failed to verify wallet signature', 'bottom');
      }
    } catch (error: any) {
      LoggerUtil.error('💥 Authentication error:', error);
      await this.hideLoading();
      await this.showToast(
        error.message || 'Failed to authenticate wallet',
        'bottom'
      );
    }
  }

  async selectWallet() {
    const modal = await this.modalController.create({
      component: WalletsModalComponent,
      cssClass: 'hsuite-modal',
      componentProps: {
        walletExtensions: this.walletConnectService.walletExtensions
      },
    });

    modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      switch (data.name) {
        case 'walletconnect':
          await this.walletConnectService.connect();
          break;
        default:
          await this.walletConnectService.connectExtension(data.id);
          break;
      }
    }
  }

  async showLoading(message: string) {
    this.loading = await this.loadingController.create({ message });
    this.loading.present();
  }

  async hideLoading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  async showToast(message: string, position: 'top' | 'middle' | 'bottom', duration?: number) {
    const toast = await this.toastController.create({
      message,
      duration: duration ? duration : 3000,
      position,
    });
    await toast.present();
  }

  async connectWallet() {
    await this.selectWallet();
  }

  async disconnectWallet(session: WC_Session) {
    await this.walletConnectService.disconnect(session.topic);
  }

  async disconnectAll() {
    await this.walletConnectService.disconnectAll();
  }

  /**
   * Show a confirmation dialog to the user
   * @param header The header/title of the confirmation dialog
   * @param message The message to display to the user
   * @returns A promise that resolves to true if confirmed, false otherwise
   */
  private async showConfirmation(header: string, message: string): Promise<boolean> {
    return await this.customModalService.presentConfirm(header, message, 'Authenticate', 'Cancel');
  }
}
