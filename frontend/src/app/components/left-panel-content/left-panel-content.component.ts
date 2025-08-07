import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LineChartComponent } from '../common/line-chart/line-chart.component';
import { AddDeviceComponent } from '../add-device/add-device.component';
import { GeoMedallionCreationComponent } from '../geo-medallion-creation/geo-medallion-creation.component';
import { PurchaseMedallionComponent } from '../purchase-medallion/purchase-medallion.component';
import { Feature } from '../../shared/types';
import { TabName } from '../../shared/enums';
import { ChartDataPoint, ChartLegends } from '../common/line-chart/line-chart.component';
import { formatTemperature, formatPressure, formatWindSpeed, formatWindDirection, formatAirQuality } from '../../shared/helpers';
import { NodesService, Device } from '../../shared/services/nodes.service';
import * as dayjs from 'dayjs';

@Component({
  selector: 'app-left-panel-content',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    LineChartComponent,
    AddDeviceComponent,
    GeoMedallionCreationComponent,
    PurchaseMedallionComponent
  ],
  template: `
    <div class="content">
      <div *ngIf="selectedTab === TabName.ADD_DEVICE">
        <app-add-device [selectedHexagon]="selectedHexagon"></app-add-device>
      </div>


      <div *ngIf="selectedTab === TabName.GEO_MEDALLION_CREATION">
        <app-geo-medallion-creation
          (coordinateSelectionToggle)="onCoordinateSelectionToggle($event)"
        ></app-geo-medallion-creation>
      </div>

      <div *ngIf="selectedTab === TabName.PURCHASE_MEDALLION">
        <app-purchase-medallion
          [selectedHexagon]="selectedHexagon"
          (purchaseComplete)="onPurchaseComplete($event)"
        ></app-purchase-medallion>
      </div>

      <div *ngIf="selectedTab === TabName.GEO_MEDALLION">
        <div class="medallion-selector">
          <div class="selector-header">
            <h3>Geo Medallion</h3>
            <p>Select a medallion on the map to view details and available actions</p>
          </div>

          <div *ngIf="!selectedHexagon" class="no-medallion-selected">
            <div class="placeholder">
              <ion-icon name="location-outline" size="large"></ion-icon>
              <h4>No Medallion Selected</h4>
              <p>Click on a hexagonal medallion on the map to see its details and available actions.</p>
            </div>
          </div>

          <div *ngIf="selectedHexagon" class="medallion-details">
            <div class="medallion-header">
              <div class="medallion-info">
                <h4>{{ selectedHexagon.hexId }}</h4>
                <p class="coordinates">
                  {{ selectedHexagon.center?.latitude | number:'1.4-4' }},
                  {{ selectedHexagon.center?.longitude | number:'1.4-4' }}
                </p>
              </div>
              <div class="medallion-status">
                <ion-badge [color]="selectedHexagon.available ? 'success' : 'primary'">
                  {{ selectedHexagon.available ? 'Available' : 'Owned' }}
                </ion-badge>
              </div>
            </div>

            <div class="medallion-info-section">
              <div class="info-row">
                <span class="label">Price:</span>
                <span class="value">{{ selectedHexagon.price }} HBAR</span>
              </div>
              <div class="info-row" *ngIf="selectedHexagon.ownerAddress">
                <span class="label">Owner:</span>
                <span class="value">{{ selectedHexagon.ownerAddress }}</span>
              </div>
              <div class="info-row" *ngIf="selectedHexagon.nftTokenId">
                <span class="label">NFT Token:</span>
                <span class="value">{{ selectedHexagon.nftTokenId }}</span>
              </div>
              <div class="info-row" *ngIf="selectedHexagon.purchasedAt">
                <span class="label">Purchased:</span>
                <span class="value">{{ selectedHexagon.purchasedAt | date:'short' }}</span>
              </div>
            </div>

            <div class="medallion-actions">
              <div *ngIf="selectedHexagon.available" class="purchase-action">
                <ion-button expand="block" color="primary" (click)="purchaseMedallion()">
                  <ion-icon name="card-outline" slot="start"></ion-icon>
                  Purchase Medallion
                </ion-button>
              </div>

              <div *ngIf="!selectedHexagon.available" class="device-actions">
                <ion-button expand="block" fill="outline" (click)="addDevice()">
                  <ion-icon name="add-circle-outline" slot="start"></ion-icon>
                  Add Device
                </ion-button>

                <div class="devices-section" *ngIf="getMedallionDevices().length > 0">
                  <h5>Devices on this Medallion</h5>
                  <div class="device-list">
                    <div *ngFor="let device of getMedallionDevices()" class="device-item" (click)="selectDevice(device)">
                      <div class="device-info">
                        <span class="device-name">{{ device.name }}</span>
                        <span class="device-id">{{ device.deviceId }}</span>
                      </div>
                      <ion-badge [color]="device.isActive ? 'success' : 'medium'">
                        {{ device.isActive ? 'Active' : 'Inactive' }}
                      </ion-badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="selectedTab !== TabName.ADD_DEVICE && selectedTab !== TabName.GEO_MEDALLION_CREATION && selectedTab !== TabName.PURCHASE_MEDALLION && selectedTab !== TabName.GEO_MEDALLION">
        <div *ngIf="!selectedNode" class="no-selection">
          <div class="placeholder">
            <ion-icon name="analytics-outline" size="large"></ion-icon>
            <h3>Select a Device</h3>
            <p>Click on a device marker on the map to view its climate data and historical measurements.</p>
          </div>
        </div>

        <div *ngIf="selectedNode" class="selected-node">
          <div class="node-header">
            <div class="node-title">
              <h3>{{ getTabTitle() }}</h3>
              <p>{{ selectedNode.properties['name'] || selectedNode.properties['uuid'] }}</p>
            </div>

            <!-- Device Information -->
            <div class="device-info" *ngIf="selectedNode.properties['deviceId']">
              <div class="info-item">
                <ion-icon name="hardware-chip-outline"></ion-icon>
                <span>Device ID: {{ selectedNode.properties['deviceId'] }}</span>
              </div>
              <div class="info-item" *ngIf="selectedNode.properties['hexId']">
                <ion-icon name="hexagon-outline"></ion-icon>
                <span>Hexagon: {{ selectedNode.properties['hexId'] }}</span>
              </div>
              <div class="info-item" *ngIf="selectedNode.properties['ownerAddress']">
                <ion-icon name="person-outline"></ion-icon>
                <span>Owner: {{ selectedNode.properties['ownerAddress'] }}</span>
              </div>
              <div class="info-item" *ngIf="selectedNode.properties['hederaAccount']">
                <ion-icon name="wallet-outline"></ion-icon>
                <span>Account: {{ selectedNode.properties['hederaAccount'] }}</span>
              </div>
            </div>

            <div class="latest-measurement" *ngIf="getLatestMeasurementValue()">
              <div class="measurement-value">{{ getLatestMeasurementValue() }}</div>
              <div class="measurement-time">{{ getLastUpdateTime() }}</div>
            </div>

            <div class="no-measurement" *ngIf="!getLatestMeasurementValue() && !isLoading">
              <ion-icon name="thermometer-outline"></ion-icon>
              <span>No recent measurements available</span>
            </div>
          </div>

          <div class="chart-section" *ngIf="chartData.length > 0">
            <app-line-chart
              [data]="chartData"
              [title]="getChartTitle()"
              [xKey]="'time'"
              [yKey]="'value'"
              [legends]="chartLegends"
            ></app-line-chart>
          </div>

          <div class="no-data" *ngIf="chartData.length === 0 && !isLoading">
            <ion-icon name="bar-chart-outline"></ion-icon>
            <p>No historical data available for the selected time range.</p>
          </div>

          <div class="loading" *ngIf="isLoading">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Loading measurement data...</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./left-panel-content.component.scss']
})
export class LeftPanelContentComponent implements OnInit, OnChanges {
  @Input() selectedNode?: Feature;
  @Input() selectedTab!: TabName;
  @Input() dateRange: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs().subtract(7, 'days'), dayjs()];
  @Input() selectedHexagon?: any; // Add input for selected hexagon
  @Output() coordinateSelectionModeChange = new EventEmitter<boolean>();

  TabName = TabName;
  chartData: ChartDataPoint[] = [];
  chartLegends: ChartLegends = {};
  isLoading = false;
  medallionDevices: Device[] = [];

  constructor(private nodesService: NodesService) {}

  ngOnInit() {}

  ngOnChanges() {
    // Load devices for selected medallion when it changes
    if (this.selectedHexagon && this.selectedTab === TabName.GEO_MEDALLION) {
      this.loadMedallionDevices();
    }
  }

  async loadMedallionDevices() {
    if (!this.selectedHexagon?.hexId) return;

    try {
      const devices = await this.nodesService.getDevices().toPromise();
      this.medallionDevices = devices?.filter(device => device.hexId === this.selectedHexagon.hexId) || [];
    } catch (error) {
      console.error('Error loading medallion devices:', error);
      this.medallionDevices = [];
    }
  }

  getMedallionDevices(): Device[] {
    return this.medallionDevices;
  }

  purchaseMedallion() {
    // Switch to purchase medallion tab
    document.dispatchEvent(new CustomEvent('switchToPurchaseTab', {
      detail: { hexagon: this.selectedHexagon }
    }));
  }

  addDevice() {
    // Switch to add device tab
    document.dispatchEvent(new CustomEvent('switchToAddDeviceTab', {
      detail: { hexagon: this.selectedHexagon }
    }));
  }

  selectDevice(device: Device) {
    // Emit event to map to focus on this device
    document.dispatchEvent(new CustomEvent('selectDevice', {
      detail: { device }
    }));
  }

  getTabTitle(): string {
    switch (this.selectedTab) {
      case TabName.ADD_DEVICE:
        return 'Add Device';
      case TabName.GEO_MEDALLION_CREATION:
        return 'Create Geo Medallion';
      case TabName.PURCHASE_MEDALLION:
        return 'Purchase Medallion';
      default:
        return 'Climate Data';
    }
  }

  getChartTitle(): string {
    return `${this.getTabTitle()} - Last 7 Days`;
  }

  getLatestMeasurementValue(): string {
    if (!this.selectedNode?.properties?.['latestMeasurement']) {
      return '';
    }

    const measurement = this.selectedNode.properties['latestMeasurement'];

    switch (this.selectedTab) {
      case TabName.ADD_DEVICE:
        return measurement.temperature ? formatTemperature(measurement.temperature.value) : 'N/A';
      default:
        return 'N/A';
    }
  }

  getLastUpdateTime(): string {
    if (!this.selectedNode?.properties?.['latestMeasurement']?.['createdAt']) {
      return '';
    }

    return dayjs(this.selectedNode.properties['latestMeasurement']['createdAt']).format('MMM DD, HH:mm');
  }

  onCoordinateSelectionToggle(isSelecting: boolean) {
    this.coordinateSelectionModeChange.emit(isSelecting);
  }

  onPurchaseComplete(result: any) {
    console.log('Purchase completed:', result);
    // Could emit event to refresh map or show success message
  }
}
