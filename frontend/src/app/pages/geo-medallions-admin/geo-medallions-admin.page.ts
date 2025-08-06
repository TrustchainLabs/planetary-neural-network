import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import {
  GeoMedallionsService,
  GeoMedallion,
  UpdateMedallionRequest,
  PaginatedMedallionsResponse
} from '../../shared/services/geo-medallions.service';
import { NodesService, Device, SensorReading, SensorAnalysis } from '../../shared/services/nodes.service';
import { CustomModalService } from '../../services/custom-modal.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-geo-medallions-admin',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, FormsModule],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title>System Overview</ion-title>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="refreshAll()">
            <ion-icon name="refresh" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="overview-content">
      <div class="overview-container">
        <!-- Simple Stats -->
        <div class="stats-section">
          <h2>System Overview</h2>
          <div class="simple-stats">
            <p>{{ overviewStats.totalMedallions }} medallions ({{ overviewStats.soldMedallions }} sold) • {{ overviewStats.totalDevices }} devices ({{ overviewStats.activeDevices }} active) • {{ overviewStats.totalSensorReadings }} sensor readings • {{ overviewStats.totalAnalysisReports }} analysis reports</p>
          </div>
        </div>

        <div class="content-section">
          <div *ngIf="isLoading" class="loading-container">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Loading data...</p>
          </div>

          <!-- Medallions Section -->
          <div class="section-header">
            <h3>Medallions</h3>
          </div>

          <div *ngIf="!isLoading && medallions.length === 0" class="no-data">
            <ion-icon name="diamond-outline" size="large"></ion-icon>
            <h3>No Medallions Found</h3>
            <p>No medallions available.</p>
          </div>

          <div *ngIf="!isLoading && medallions.length > 0" class="medallions-grid">
            <div
              *ngFor="let medallion of medallions"
              class="medallion-card"
              [class.available]="medallion.available"
              [class.sold]="!medallion.available && medallion.ownerAddress"
            >
              <div class="card-header">
                <div class="medallion-info">
                  <h3>{{ medallion.hexId }}</h3>
                  <p class="coordinates">
                    {{ medallion.center.latitude | number:'1.4-4' }},
                    {{ medallion.center.longitude | number:'1.4-4' }}
                  </p>
                </div>
                <div class="medallion-status">
                  <ion-badge
                    [color]="medallion.available ? 'success' : (medallion.ownerAddress ? 'primary' : 'medium')"
                  >
                    {{ getStatusText(medallion) }}
                  </ion-badge>
                </div>
              </div>

              <div class="card-details">
                <div class="detail-row">
                  <span class="label">Price:</span>
                  <span class="value">{{ medallion.price }} HBAR</span>
                </div>
                <div class="detail-row" *ngIf="medallion.ownerAddress">
                  <span class="label">Owner:</span>
                  <span class="value owner-address">{{ medallion.ownerAddress }}</span>
                </div>
                <div class="detail-row" *ngIf="medallion.nftTokenId">
                  <span class="label">NFT Token:</span>
                  <span class="value">{{ medallion.nftTokenId }}</span>
                </div>
                <div class="detail-row" *ngIf="medallion.purchasedAt">
                  <span class="label">Purchased:</span>
                  <span class="value">{{ medallion.purchasedAt | date:'short' }}</span>
                </div>
                <div class="detail-row" *ngIf="medallion.devices && medallion.devices.length > 0">
                  <span class="label">Devices:</span>
                  <span class="value">{{ medallion.devices.length }}</span>
                </div>
              </div>

              <div class="card-actions">
                <ion-button
                  fill="outline"
                  size="small"
                  (click)="editMedallion(medallion)"
                  [disabled]="isUpdating"
                >
                  Edit
                </ion-button>
                <ion-button
                  fill="clear"
                  size="small"
                  color="medium"
                  (click)="viewDetails(medallion)"
                >
                  Details
                </ion-button>
              </div>
            </div>
          </div>

          <div class="pagination" *ngIf="paginationData && paginationData.totalPages > 1">
            <ion-button
              fill="clear"
              [disabled]="paginationData.page <= 1"
              (click)="changePage(paginationData.page - 1)"
            >
              <ion-icon name="chevron-back" slot="icon-only"></ion-icon>
            </ion-button>

            <span class="page-info">
              Page {{ paginationData.page }} of {{ paginationData.totalPages }}
            </span>

            <ion-button
              fill="clear"
              [disabled]="paginationData.page >= paginationData.totalPages"
              (click)="changePage(paginationData.page + 1)"
            >
              <ion-icon name="chevron-forward" slot="icon-only"></ion-icon>
            </ion-button>
          </div>

          <!-- Devices Section -->
          <div class="section-header">
            <h3>Devices</h3>
          </div>

          <div *ngIf="!isLoading && allDevices.length === 0" class="no-data">
            <ion-icon name="radio-outline" size="large"></ion-icon>
            <h3>No Devices Found</h3>
            <p>No devices available.</p>
          </div>

          <div *ngIf="!isLoading && allDevices.length > 0" class="medallions-grid">
            <div
              *ngFor="let device of allDevices"
              class="medallion-card"
              [class.available]="device.isActive"
              [class.sold]="!device.isActive"
            >
              <div class="card-header">
                <div class="medallion-info">
                  <h3>{{ device.name }}</h3>
                  <p class="coordinates">{{ device.deviceId }}</p>
                </div>
                <div class="medallion-status">
                  <ion-badge
                    [color]="device.isActive ? 'success' : 'medium'"
                  >
                    {{ device.isActive ? 'Active' : 'Inactive' }}
                  </ion-badge>
                </div>
              </div>

              <div class="card-details">
                <div class="detail-row">
                  <span class="label">Medallion:</span>
                  <span class="value">{{ device.hexId }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Owner:</span>
                  <span class="value owner-address">{{ device.ownerAddress }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Sensor Readings:</span>
                  <span class="value">{{ getSensorDataCount(device.deviceId, 'readings') }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Analysis Reports:</span>
                  <span class="value">{{ getSensorDataCount(device.deviceId, 'analysis') }}</span>
                </div>
                <div class="detail-row" *ngIf="device.hederaAccount">
                  <span class="label">Hedera Account:</span>
                  <span class="value">{{ device.hederaAccount }}</span>
                </div>
                <div class="detail-row" *ngIf="device.hcsTopic">
                  <span class="label">HCS Topic:</span>
                  <span class="value">{{ device.hcsTopic }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Created:</span>
                  <span class="value">{{ device.createdAt | date:'short' }}</span>
                </div>
              </div>

              <div class="card-actions">
                <ion-button
                  fill="outline"
                  size="small"
                  (click)="viewDeviceDetails(device)"
                  [disabled]="isUpdating"
                >
                  Details
                </ion-button>
                <ion-button
                  fill="clear"
                  size="small"
                  [color]="device.isActive ? 'danger' : 'success'"
                  (click)="toggleDevice(device)"
                  [disabled]="isUpdating"
                >
                  {{ device.isActive ? 'Stop' : 'Start' }}
                </ion-button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['./geo-medallions-admin.page.scss']
})
export class GeoMedallionsAdminPage implements OnInit {
  medallions: GeoMedallion[] = [];
  allDevices: Device[] = [];
  paginationData: any = null;
  isLoading = false;
  isUpdating = false;
  currentPage = 1;
  pageSize = 50; // Show more items since we're not paginating

  overviewStats = {
    totalMedallions: 0,
    soldMedallions: 0,
    totalDevices: 0,
    activeDevices: 0,
    totalSensorReadings: 0,
    totalAnalysisReports: 0
  };

  deviceSensorData: Map<string, { readings: SensorReading[], analysis: SensorAnalysis[] }> = new Map();

  constructor(
    private geoMedallionsService: GeoMedallionsService,
    private nodesService: NodesService,
    private toastController: ToastController,
    private modalController: ModalController,
    private customModalService: CustomModalService
  ) {}

  ngOnInit() {
    this.loadOverviewData();
  }

  async loadOverviewData() {
    this.isLoading = true;
    try {
      // Load medallions and devices first
      await Promise.all([
        this.loadMedallions(),
        this.loadDevices()
      ]);

      // Then load sensor data for each device
      await this.loadSensorDataForDevices();

      this.calculateOverviewStats();
    } catch (error) {
      console.error('Error loading overview data:', error);
      this.showError('Failed to load overview data');
    } finally {
      this.isLoading = false;
    }
  }

  async refreshAll() {
    await this.loadOverviewData();
    this.showSuccess('Data refreshed successfully');
  }

  async loadDevices() {
    try {
      this.allDevices = await firstValueFrom(this.nodesService.getDevices());
    } catch (error) {
      console.error('Error loading devices:', error);
      throw error;
    }
  }

  async loadSensorDataForDevices() {
    console.log('Loading sensor data for all devices...');

    for (const device of this.allDevices) {
      try {
        const [readings, analysis] = await Promise.all([
          firstValueFrom(this.nodesService.getRawSensorData(device.deviceId)),
          firstValueFrom(this.nodesService.getSensorAnalysis(device.deviceId))
        ]);

        this.deviceSensorData.set(device.deviceId, { readings, analysis });
        console.log(`Loaded sensor data for device ${device.deviceId}: ${readings.length} readings, ${analysis.length} analyses`);
      } catch (error) {
        console.warn(`Error loading sensor data for device ${device.deviceId}:`, error);
        // Set empty arrays if no data available
        this.deviceSensorData.set(device.deviceId, { readings: [], analysis: [] });
      }
    }
  }

  calculateOverviewStats() {
    // Calculate total sensor readings and analysis reports
    let totalReadings = 0;
    let totalAnalysis = 0;

    this.deviceSensorData.forEach(data => {
      totalReadings += data.readings.length;
      totalAnalysis += data.analysis.length;
    });

    this.overviewStats = {
      totalMedallions: this.medallions.length,
      soldMedallions: this.medallions.filter(m => !m.available && m.ownerAddress).length,
      totalDevices: this.allDevices.length,
      activeDevices: this.allDevices.filter(d => d.isActive).length,
      totalSensorReadings: totalReadings,
      totalAnalysisReports: totalAnalysis
    };
  }

  async loadMedallions() {
    try {
      const params: any = {
        page: this.currentPage,
        limit: this.pageSize
      };

      const response: PaginatedMedallionsResponse = await this.geoMedallionsService.getMedallions(params).toPromise();
      this.medallions = response.data;
      this.paginationData = {
        page: response.page,
        totalPages: response.totalPages,
        total: response.total,
        limit: response.limit
      };
    } catch (error) {
      console.error('Error loading medallions:', error);
      throw error;
    }
  }



  changePage(page: number) {
    this.currentPage = page;
    this.loadMedallions();
  }

  getStatusText(medallion: GeoMedallion): string {
    if (medallion.available) {
      return 'Available';
    } else if (medallion.ownerAddress) {
      return 'Sold';
    } else {
      return 'Unavailable';
    }
  }

  async editMedallion(medallion: GeoMedallion) {
    const inputs = [
      {
        name: 'price',
        type: 'number' as const,
        label: 'Price (HBAR)',
        value: medallion.price,
        min: 0,
        required: true
      },
      {
        name: 'available',
        type: 'checkbox' as const,
        label: 'Available for purchase',
        checked: medallion.available
      },
      {
        name: 'ownerAddress',
        type: 'text' as const,
        label: 'Owner Address',
        placeholder: 'Enter owner address (optional)',
        value: medallion.ownerAddress || ''
      },
      {
        name: 'nftTokenId',
        type: 'text' as const,
        label: 'NFT Token ID',
        placeholder: 'Enter NFT token ID (optional)',
        value: medallion.nftTokenId || ''
      },
      {
        name: 'hederaTopicId',
        type: 'text' as const,
        label: 'Hedera Topic ID',
        placeholder: 'Enter Hedera topic ID (optional)',
        value: medallion.hederaTopicId || ''
      }
    ];

    const data = await this.customModalService.presentInput(
      'Edit Medallion',
      inputs,
      `<strong>Hex ID:</strong> ${medallion.hexId}<br><br>Update the medallion details below:`,
      'Update',
      'Cancel'
    );

    if (data) {
      this.updateMedallion(medallion.hexId, data);
    }
  }

  async updateMedallion(hexId: string, data: any) {
    this.isUpdating = true;

    try {
      const updateRequest: UpdateMedallionRequest = {
        price: parseFloat(data.price),
        available: data.available,
        ...(data.ownerAddress && { ownerAddress: data.ownerAddress }),
        ...(data.nftTokenId && { nftTokenId: data.nftTokenId }),
        ...(data.hederaTopicId && { hederaTopicId: data.hederaTopicId })
      };

      await this.geoMedallionsService.updateMedallion(hexId, updateRequest).toPromise();
      await this.presentToast('Medallion updated successfully', 'success');
      this.loadMedallions(); // Reload the list
    } catch (error) {
      console.error('Error updating medallion:', error);
      await this.presentToast('Failed to update medallion', 'danger');
    } finally {
      this.isUpdating = false;
    }
  }

  async viewDetails(medallion: GeoMedallion) {
    const message = `
      <strong>Coordinates:</strong> ${medallion.center.latitude}, ${medallion.center.longitude}<br>
      <strong>Price:</strong> ${medallion.price} HBAR<br>
      <strong>Status:</strong> ${this.getStatusText(medallion)}<br>
      ${medallion.ownerAddress ? `<strong>Owner:</strong> ${medallion.ownerAddress}<br>` : ''}
      ${medallion.nftTokenId ? `<strong>NFT Token:</strong> ${medallion.nftTokenId}<br>` : ''}
      ${medallion.hederaTopicId ? `<strong>Hedera Topic:</strong> ${medallion.hederaTopicId}<br>` : ''}
      ${medallion.purchaseTransactionId ? `<strong>Purchase TX:</strong> ${medallion.purchaseTransactionId}<br>` : ''}
      ${medallion.purchasedAt ? `<strong>Purchased:</strong> ${new Date(medallion.purchasedAt).toLocaleString()}<br>` : ''}
      ${medallion.mintTransactionId ? `<strong>Mint TX:</strong> ${medallion.mintTransactionId}<br>` : ''}
      ${medallion.mintedAt ? `<strong>Minted:</strong> ${new Date(medallion.mintedAt).toLocaleString()}<br>` : ''}
      ${medallion.devices && medallion.devices.length > 0 ? `<strong>Devices:</strong> ${medallion.devices.length}<br>` : ''}
      <strong>Created:</strong> ${new Date(medallion.createdAt).toLocaleString()}<br>
      <strong>Updated:</strong> ${new Date(medallion.updatedAt).toLocaleString()}
    `;

    await this.customModalService.presentInfo(
      `Medallion Details - ${medallion.hexId}`,
      message,
      'Close'
    );
  }

  getSensorDataCount(deviceId: string, type: 'readings' | 'analysis'): number {
    const data = this.deviceSensorData.get(deviceId);
    if (!data) return 0;
    return type === 'readings' ? data.readings.length : data.analysis.length;
  }

  async viewDeviceDetails(device: Device) {
    const sensorData = this.deviceSensorData.get(device.deviceId);
    const readingsCount = sensorData?.readings.length || 0;
    const analysisCount = sensorData?.analysis.length || 0;

    // Get latest analysis if available
    const latestAnalysis = sensorData?.analysis.length ? sensorData.analysis[sensorData.analysis.length - 1] : null;

    const message = `
      <div class="device-details-modal">
        <h4>Device Information</h4>
        <p><strong>Device ID:</strong> ${device.deviceId}</p>
        <p><strong>Medallion:</strong> ${device.hexId}</p>
        <p><strong>Owner:</strong> ${device.ownerAddress}</p>
        <p><strong>Status:</strong> ${device.isActive ? 'Active' : 'Inactive'}</p>
        <p><strong>Hedera Account:</strong> ${device.hederaAccount || 'Not set'}</p>
        <p><strong>HCS Topic:</strong> ${device.hcsTopic || 'Not set'}</p>

        <h4>Sensor Data</h4>
        <p><strong>Total Readings:</strong> ${readingsCount}</p>
        <p><strong>Analysis Reports:</strong> ${analysisCount}</p>

        ${latestAnalysis ? `
        <h4>Latest Analysis</h4>
        <p><strong>Average Temperature:</strong> ${latestAnalysis.averageTemperature.toFixed(2)}${latestAnalysis.unit}</p>
        <p><strong>Range:</strong> ${latestAnalysis.minimumTemperature}${latestAnalysis.unit} - ${latestAnalysis.maximumTemperature}${latestAnalysis.unit}</p>
        <p><strong>Trend:</strong> ${latestAnalysis.predictions[0]?.trend || 'Unknown'}</p>
        <p><strong>Stability Score:</strong> ${(latestAnalysis.statisticalData.stabilityScore * 100).toFixed(1)}%</p>
        <p><strong>AI Insights:</strong> ${latestAnalysis.aiInsights}</p>
        <p><strong>Last Analysis:</strong> ${new Date(latestAnalysis.analysisTimestamp).toLocaleString()}</p>
        ` : '<p><em>No analysis data available</em></p>'}

        <h4>Device Info</h4>
        <p><strong>Created:</strong> ${new Date(device.createdAt).toLocaleDateString()}</p>
        <p><strong>Updated:</strong> ${new Date(device.updatedAt).toLocaleDateString()}</p>
      </div>
    `;

    await this.customModalService.presentInfo(`${device.name} - Details`, message, 'Close');
  }

  async toggleDevice(device: Device) {
    const action = device.isActive ? 'stop' : 'start';
    const confirmed = await this.customModalService.presentConfirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Device`,
      `Are you sure you want to ${action} data collection for device <strong>"${device.name}"</strong>?`,
      action.charAt(0).toUpperCase() + action.slice(1),
      'Cancel'
    );

    if (confirmed) {
      this.isUpdating = true;
      try {
        if (device.isActive) {
          await firstValueFrom(this.nodesService.stopDataCollection(device.deviceId, device.privateKey || ''));
        } else {
          await firstValueFrom(this.nodesService.startDataCollection(device.deviceId, device.privateKey || ''));
        }

        // Refresh device data and sensor data
        await this.loadDevices();
        await this.loadSensorDataForDevices();
        this.calculateOverviewStats();
        this.showSuccess(`Device ${action}ed successfully`);
      } catch (error) {
        console.error(`Error ${action}ing device:`, error);
        this.showError(`Failed to ${action} device`);
      } finally {
        this.isUpdating = false;
      }
    }
  }

  private async showSuccess(message: string) {
    await this.presentToast(message, 'success');
  }

  private async showError(message: string) {
    await this.presentToast(message, 'danger');
  }

  private async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
