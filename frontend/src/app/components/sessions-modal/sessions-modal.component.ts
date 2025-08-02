import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { WalletConnectService, WC_Session } from '../../services/wallet-connect.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  selector: 'app-sessions-modal',
  templateUrl: './sessions-modal.component.html',
  styleUrls: ['./sessions-modal.component.scss'],
})
export class WalletsSessionsComponent implements OnInit {
  @Input() public sessions: Array<WC_Session> = new Array<WC_Session>();
  @Input() public selectedSession: WC_Session = null;

  public sortedSessions: Array<WC_Session> = [];

  constructor(
    private modalCtrl: ModalController,
    private walletConnectService: WalletConnectService
  ) {}

  ngOnInit() {
    this.walletConnectService.eventsObserver.subscribe(async (event: any) => {
      if (event.type == 'session_delete' && event.content.type == 'success') {
        this.sessions = await this.walletConnectService.mapSessions();
        this.sortSessions();
      }
    });
    this.sortSessions();
  }

  sortSessions() {
    this.sortedSessions = [...this.sessions].sort((a, b) => {
      if (a.wallet === this.selectedSession?.wallet) return -1;
      if (b.wallet === this.selectedSession?.wallet) return 1;
      return 0;
    });
  }

  selectSession(session: WC_Session) {
    this.selectedSession = session;
    this.sortSessions();
    return this.modalCtrl.dismiss(this.selectedSession, 'confirm');
  }

  closeSession(session: WC_Session) {
    return this.modalCtrl.dismiss(session, 'logout');
  }

  addAccount() {
    return this.modalCtrl.dismiss(null, 'add');
  }

  closeModal() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }
}
