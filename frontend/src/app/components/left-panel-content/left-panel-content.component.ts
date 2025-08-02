import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LineChartComponent } from '../common/line-chart/line-chart.component';
import { AddDeviceComponent } from '../add-device/add-device.component';
import { Feature } from '../../shared/types';
import { TabName } from '../../shared/enums';
import { MeasurementsService } from '../../shared/services/measurements.service';
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
    AddDeviceComponent
  ],
  template: `
    <div class="content">
      <div *ngIf="selectedTab === TabName.ADD_DEVICE">
        <app-add-device></app-add-device>
      </div>

      <div *ngIf="selectedTab !== TabName.ADD_DEVICE">
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

            <div class="latest-measurement" *ngIf="getLatestMeasurementValue()">
              <div class="measurement-value">{{ getLatestMeasurementValue() }}</div>
              <div class="measurement-time">{{ getLastUpdateTime() }}</div>
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

  TabName = TabName;
  chartData: ChartDataPoint[] = [];
  chartLegends: ChartLegends = {};
  isLoading = false;

  constructor(private measurementsService: MeasurementsService) {}

  ngOnInit() {
    this.loadChartData();
  }

  ngOnChanges() {
    this.loadChartData();
  }

  getTabTitle(): string {
    switch (this.selectedTab) {
      case TabName.TEMPERATURE:
        return 'Temperature';
      case TabName.ATM_PRESSURE:
        return 'Atmospheric Pressure';
      case TabName.WIND_SPEED:
        return 'Wind Speed';
      case TabName.WIND_DIRECTION:
        return 'Wind Direction';
      case TabName.AIR_QUALITY:
        return 'Air Quality';
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
      case TabName.TEMPERATURE:
        return measurement.temperature ? formatTemperature(measurement.temperature.value) : 'N/A';
      case TabName.ATM_PRESSURE:
        return measurement.atmPressure ? formatPressure(measurement.atmPressure.value) : 'N/A';
      case TabName.WIND_SPEED:
        return measurement.windSpeed ? formatWindSpeed(measurement.windSpeed.value) : 'N/A';
      case TabName.WIND_DIRECTION:
        return measurement.windDirection ? formatWindDirection(measurement.windDirection.value) : 'N/A';
      case TabName.AIR_QUALITY:
        return measurement.airQuality ? formatAirQuality(measurement.airQuality.value) : 'N/A';
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

  async loadChartData() {
    if (!this.selectedNode || this.selectedTab === TabName.ADD_DEVICE) {
      this.chartData = [];
      return;
    }

    this.isLoading = true;
    try {
      const measurements = await this.measurementsService.getMeasurements({
        nodeId: this.selectedNode.properties?.['id'] || '',
        startDate: this.dateRange[0].toISOString(),
        endDate: this.dateRange[1].toISOString(),
        measurementType: this.selectedTab
      }).toPromise();

      if (measurements && measurements.length > 0) {
        this.chartData = measurements.map(m => ({
          time: dayjs(m.timestamp).format('MMM DD HH:mm'),
          value: this.getMeasurementValue(m)
        }));
      } else {
        this.chartData = [];
      }

      this.chartLegends = {
        value: this.getTabTitle()
      };
    } catch (error) {
      console.error('Failed to load chart data:', error);
      this.chartData = [];
    } finally {
      this.isLoading = false;
    }
  }

  private getMeasurementValue(measurement: any): number {
    switch (this.selectedTab) {
      case TabName.TEMPERATURE:
        return measurement.temperature || 0;
      case TabName.ATM_PRESSURE:
        return measurement.atmPressure || 0;
      case TabName.WIND_SPEED:
        return measurement.windSpeed || 0;
      case TabName.WIND_DIRECTION:
        return measurement.windDirection || 0;
      case TabName.AIR_QUALITY:
        return measurement.airQuality || 0;
      default:
        return 0;
    }
  }
}
