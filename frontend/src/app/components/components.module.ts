import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Import standalone components directly
import { WalletConnectionComponent } from './wallet-connection/wallet-connection.component';
import { WalletsSessionsComponent } from './sessions-modal/sessions-modal.component';
import { WalletsModalComponent } from './wallets-modal/wallets-modal.component';
import { DeviceManagementComponent } from './device-management/device-management.component';
import { GeoMedallionCreationComponent } from './geo-medallion-creation/geo-medallion-creation.component';
import { PurchaseMedallionComponent } from './purchase-medallion/purchase-medallion.component';
import { CustomModalComponent } from './common/custom-modal/custom-modal.component';

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
    DeviceManagementComponent,
    GeoMedallionCreationComponent,
    PurchaseMedallionComponent,
    CustomModalComponent,
  ],
  declarations: [],
  exports: [
    // Export standalone components
    WalletConnectionComponent,
    WalletsSessionsComponent,
    WalletsModalComponent,
    DeviceManagementComponent,
    GeoMedallionCreationComponent,
    PurchaseMedallionComponent,
    CustomModalComponent,
  ],
})
export class ComponentsModule {}
