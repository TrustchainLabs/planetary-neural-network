import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TabComponent } from '../../common/tab/tab.component';
import { UserTabComponent } from '../user-tab/user-tab.component';
import { TabName } from '../../../shared/enums';
import { Router } from '@angular/router';

@Component({
  selector: 'app-left-nav',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    TabComponent,
    UserTabComponent
  ],
  template: `
    <div class="container">
      <a href="https://ecosphereprime.com" target="_blank" class="brand-link">
        <img
          src="assets/images/brand-logo.svg"
          alt="Brand Logo"
          width="36"
          height="36"
        />
      </a>

      <div class="tabs">
        <!-- 1. Dashboard -->
        <app-tab
          className="dashboard"
          [name]="TabName.DASHBOARD"
          tooltip="System Dashboard"
          icon="stats-chart-outline"
          alt="Dashboard"
          [active]="selectedTab === TabName.DASHBOARD"
          (tabClick)="onTabSelect($event)"
        ></app-tab>

        <!-- 2. Geo Medallion (Selector & Details) -->
        <app-tab
          className="geo-medallion"
          [name]="TabName.GEO_MEDALLION"
          tooltip="Geo Medallion"
          icon="location-outline"
          alt="Medallion"
          [active]="selectedTab === TabName.GEO_MEDALLION"
          (tabClick)="onTabSelect($event)"
        ></app-tab>

        <!-- 3. Create Geo Medallion -->
        <app-tab
          className="geo-medallion-creation"
          [name]="TabName.GEO_MEDALLION_CREATION"
          tooltip="Create Geo Medallion"
          icon="add-circle-outline"
          alt="Create"
          [active]="selectedTab === TabName.GEO_MEDALLION_CREATION"
          (tabClick)="onTabSelect($event)"
        ></app-tab>
      </div>

      <!-- Connect Wallet Button at Bottom
      <div class="connect-wallet-section">
        <button class="connect-wallet-btn" (click)="connectWallet()">
          <ion-icon name="wallet-outline"></ion-icon>
          <span>Connect Wallet</span>
        </button>
      </div> -->

      <app-user-tab class="user-tab"></app-user-tab>
    </div>
  `,
  styleUrls: ['./left-nav.component.scss']
})
export class LeftNavComponent {
  @Input() selectedTab!: string;
  @Output() tabSelect = new EventEmitter<TabName>();

  TabName = TabName;

  constructor(private router: Router) {}

  onTabSelect(tab: TabName) {
    if (tab === TabName.DASHBOARD) {
      // Navigate to admin dashboard
      this.router.navigate(['/admin-dashboard']);
    } else {
      // For other tabs, emit to parent (home page) to handle
      this.tabSelect.emit(tab);
    }
  }

  connectWallet() {
    // Navigate to login page for wallet connection
    this.router.navigate(['/login']);
  }
}
