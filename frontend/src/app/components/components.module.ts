import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Import standalone components directly
import { WalletConnectionComponent } from './wallet-connection/wallet-connection.component';
import { WalletsSessionsComponent } from './sessions-modal/sessions-modal.component';
import { WalletsModalComponent } from './wallets-modal/wallets-modal.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    // Import standalone components
    WalletConnectionComponent,
    WalletsSessionsComponent,
    WalletsModalComponent,
  ],
  declarations: [],
  exports: [
    // Export standalone components
    WalletConnectionComponent,
    WalletsSessionsComponent,
    WalletsModalComponent,
  ],
})
export class ComponentsModule {}
