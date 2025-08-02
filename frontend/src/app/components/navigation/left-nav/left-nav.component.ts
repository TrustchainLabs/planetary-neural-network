import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TabComponent } from '../../common/tab/tab.component';
import { UserTabComponent } from '../user-tab/user-tab.component';
import { TabName } from '../../../shared/enums';

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
        <app-tab
          [name]="TabName.TEMPERATURE"
          tooltip="Temperature"
          src="assets/icons/thermostat.svg"
          alt="Thermostat"
          [active]="selectedTab === TabName.TEMPERATURE"
          (tabClick)="onTabSelect($event)"
        ></app-tab>

        <app-tab
          [name]="TabName.ATM_PRESSURE"
          tooltip="Atm Pressure"
          src="assets/icons/gauge.svg"
          alt="Gauge"
          [active]="selectedTab === TabName.ATM_PRESSURE"
          (tabClick)="onTabSelect($event)"
        ></app-tab>

        <app-tab
          [name]="TabName.WIND_SPEED"
          tooltip="Wind Speed"
          src="assets/icons/wind.svg"
          alt="Wind"
          [active]="selectedTab === TabName.WIND_SPEED"
          (tabClick)="onTabSelect($event)"
        ></app-tab>

        <app-tab
          [name]="TabName.WIND_DIRECTION"
          tooltip="Wind Direction"
          src="assets/icons/compass.svg"
          alt="Compass"
          [active]="selectedTab === TabName.WIND_DIRECTION"
          (tabClick)="onTabSelect($event)"
        ></app-tab>

        <app-tab
          [name]="TabName.AIR_QUALITY"
          tooltip="Air Quality"
          src="assets/icons/airwave.svg"
          alt="Airwave"
          [active]="selectedTab === TabName.AIR_QUALITY"
          (tabClick)="onTabSelect($event)"
        ></app-tab>

        <app-tab
          className="add-device"
          [name]="TabName.ADD_DEVICE"
          tooltip="Add Device"
          src="assets/icons/plus.svg"
          alt="Plus"
          [active]="selectedTab === TabName.ADD_DEVICE"
          (tabClick)="onTabSelect($event)"
        ></app-tab>
      </div>

      <app-user-tab class="user-tab"></app-user-tab>
    </div>
  `,
  styleUrls: ['./left-nav.component.scss']
})
export class LeftNavComponent {
  @Input() selectedTab!: string;
  @Output() tabSelect = new EventEmitter<TabName>();

  TabName = TabName;

  onTabSelect(tab: TabName) {
    this.tabSelect.emit(tab);
  }
}
