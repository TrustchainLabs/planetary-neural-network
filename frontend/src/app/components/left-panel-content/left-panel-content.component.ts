import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LineChartComponent } from '../common/line-chart/line-chart.component';
import { AddDeviceComponent } from '../add-device/add-device.component';
import { DeviceManagementComponent } from '../device-management/device-management.component';
import { GeoMedallionCreationComponent } from '../geo-medallion-creation/geo-medallion-creation.component';
import { PurchaseMedallionComponent } from '../purchase-medallion/purchase-medallion.component';
import { Feature } from '../../shared/types';
import { TabName } from '../../shared/enums';
import { ChartDataPoint, ChartLegends } from '../common/line-chart/line-chart.component';
import { formatTemperature, formatPressure, formatWindSpeed, formatWindDirection, formatAirQuality } from '../../shared/helpers';
import * as dayjs from 'dayjs';

@Component({
  selector: 'app-left-panel-content',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    LineChartComponent,
    AddDeviceComponent,
    DeviceManagementComponent,
    GeoMedallionCreationComponent,
    PurchaseMedallionComponent
  ],
  template: `
    <div class="content">
      <div *ngIf="selectedTab === TabName.ADD_DEVICE">
        <app-add-device [selectedHexagon]="selectedHexagon"></app-add-device>
      </div>

      <div *ngIf="selectedTab === TabName.DEVICE_MANAGEMENT">
        <app-device-management></app-device-management>
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

      <div *ngIf="selectedTab !== TabName.ADD_DEVICE && selectedTab !== TabName.DEVICE_MANAGEMENT && selectedTab !== TabName.GEO_MEDALLION_CREATION && selectedTab !== TabName.PURCHASE_MEDALLION">
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

  constructor() {}

  ngOnInit() {}

  ngOnChanges() {}

  getTabTitle(): string {
    switch (this.selectedTab) {
      case TabName.ADD_DEVICE:
        return 'Add Device';
      case TabName.DEVICE_MANAGEMENT:
        return 'Device Management';
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
