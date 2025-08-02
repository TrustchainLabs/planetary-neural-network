import { Component } from '@angular/core';
import { WalletConnectService } from '../services/wallet-connect.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {

  public userLoggedIn: string | null = null;


  constructor(
    private walletConnectService: WalletConnectService,
  ) {}

  private async init(): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        const session = await this.walletConnectService.getSelectedSession();
        this.userLoggedIn = session ? session.wallet : null;

        if (this.userLoggedIn) {
          console.log('🔍 User logged in:', this.userLoggedIn);
        } else {
          console.log('🔍 User not logged in');
        }

        resolve(true);
      } catch (error) {
        console.error(error);
        reject(false);
      }
    });
  }

  async ngOnInit() {

    this.walletConnectService.eventsObserver.subscribe(async (event: any) => {
      if (event.type === 'session_select' && event.payload) {
        this.userLoggedIn = event.payload.wallet;
        await this.init();
      } else if (event.type === 'session_disconnect' || event.type === 'session_delete') {
        this.userLoggedIn = null;
        await this.init();
      }
    });

    try {
      await this.init();
    } catch (error: any) {
      console.error(error);
    }
  }

}
