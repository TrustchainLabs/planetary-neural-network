import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { NodesService, Device } from '../../shared/services/nodes.service';

@Component({
  selector: 'app-device-management',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="device-management">
      <div class="header">
        <h2>Device Management</h2>
        <p>Start and stop your IoT climate monitoring devices</p>
      </div>

      <div class="content">
        <div *ngIf="isLoading" class="loading">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Loading devices...</p>
        </div>

        <div *ngIf="!isLoading && devices.length === 0" class="no-devices">
          <ion-icon name="warning-outline" size="large"></ion-icon>
          <h3>No Devices Found</h3>
          <p>You haven't registered any devices yet. Add a device first to manage it here.</p>
        </div>

        <div *ngIf="!isLoading && devices.length > 0" class="devices-list">
          <div *ngFor="let device of devices" class="device-card">
            <div class="device-header">
              <div class="device-info">
                <h3>{{ device.name }}</h3>
                <p class="device-id">{{ device.deviceId }}</p>
                <p class="medallion-id">Medallion: {{ device.hexId }}</p>
              </div>
              <div class="device-status">
                <ion-badge
                  [color]="device.isActive ? 'success' : 'medium'"
                  class="status-badge"
                >
                  {{ device.isActive ? 'Active' : 'Inactive' }}
                </ion-badge>
              </div>
            </div>

            <div class="device-details">
              <div class="detail-row">
                <span class="label">Owner:</span>
                <span class="value">{{ device.ownerAddress }}</span>
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
                <span class="value">{{ formatDate(device.createdAt) }}</span>
              </div>
            </div>

            <div class="device-actions">
              <ion-button
                *ngIf="!device.isActive"
                expand="block"
                color="success"
                (click)="startDevice(device)"
                [disabled]="isProcessingDevice === device.deviceId"
                class="action-button"
              >
                <ion-spinner *ngIf="isProcessingDevice === device.deviceId" name="crescent"></ion-spinner>
                <ion-icon *ngIf="isProcessingDevice !== device.deviceId" name="play-outline"></ion-icon>
                <span *ngIf="isProcessingDevice !== device.deviceId">Start Device</span>
              </ion-button>

              <ion-button
                *ngIf="device.isActive"
                expand="block"
                color="danger"
                (click)="stopDevice(device)"
                [disabled]="isProcessingDevice === device.deviceId"
                class="action-button"
              >
                <ion-spinner *ngIf="isProcessingDevice === device.deviceId" name="crescent"></ion-spinner>
                <ion-icon *ngIf="isProcessingDevice !== device.deviceId" name="stop-outline"></ion-icon>
                <span *ngIf="isProcessingDevice !== device.deviceId">Stop Device</span>
              </ion-button>

              <ion-button
                expand="block"
                fill="outline"
                color="medium"
                (click)="viewDeviceDetails(device)"
                class="action-button"
              >
                <ion-icon name="information-circle-outline"></ion-icon>
                <span>View Details</span>
              </ion-button>
            </div>
          </div>
        </div>

        <div class="refresh-section">
          <ion-button
            expand="block"
            fill="outline"
            (click)="refreshDevices()"
            [disabled]="isLoading"
            class="refresh-button"
          >
            <ion-spinner *ngIf="isLoading" name="crescent"></ion-spinner>
            <ion-icon *ngIf="!isLoading" name="refresh-outline"></ion-icon>
            <span *ngIf="!isLoading">Refresh Devices</span>
          </ion-button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./device-management.component.scss']
})
export class DeviceManagementComponent implements OnInit {
  devices: Device[] = [];
  isLoading = false;
  isProcessingDevice: string | null = null;

  constructor(
    private nodesService: NodesService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadDevices();
  }

  async loadDevices() {
    this.isLoading = true;
    try {
      this.devices = await this.nodesService.getDevices().toPromise() || [];
    } catch (error) {
      console.error('Error loading devices:', error);
      await this.showError('Failed to load devices. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async refreshDevices() {
    await this.loadDevices();
  }

  async startDevice(device: Device) {
    const alert = await this.alertController.create({
      header: 'Start Device',
      message: `Are you sure you want to start data collection for device "${device.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Start',
          handler: () => this.performDeviceAction(device, 'start')
        }
      ]
    });
    await alert.present();
  }

  async stopDevice(device: Device) {
    const alert = await this.alertController.create({
      header: 'Stop Device',
      message: `Are you sure you want to stop data collection for device "${device.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Stop',
          handler: () => this.performDeviceAction(device, 'stop')
        }
      ]
    });
    await alert.present();
  }

  private async performDeviceAction(device: Device, action: 'start' | 'stop') {
    this.isProcessingDevice = device.deviceId;
    try {
      await this.nodesService.triggerDevice(device.deviceId, action).toPromise();

      // Update the device status locally
      device.isActive = action === 'start';

      const message = action === 'start'
        ? `Device "${device.name}" started successfully!`
        : `Device "${device.name}" stopped successfully!`;

      await this.showSuccess(message);
    } catch (error) {
      console.error(`Error ${action}ing device:`, error);
      const errorMessage = action === 'start'
        ? `Failed to start device "${device.name}". Please try again.`
        : `Failed to stop device "${device.name}". Please try again.`;
      await this.showError(errorMessage);
    } finally {
      this.isProcessingDevice = null;
    }
  }

  async viewDeviceDetails(device: Device) {
    const alert = await this.alertController.create({
      header: device.name,
      message: `
        <div class="device-details-modal">
          <p><strong>Device ID:</strong> ${device.deviceId}</p>
          <p><strong>Medallion:</strong> ${device.hexId}</p>
          <p><strong>Owner:</strong> ${device.ownerAddress}</p>
          <p><strong>Hedera Account:</strong> ${device.hederaAccount || 'Not set'}</p>
          <p><strong>HCS Topic:</strong> ${device.hcsTopic || 'Not set'}</p>
          <p><strong>Status:</strong> ${device.isActive ? 'Active' : 'Inactive'}</p>
          <p><strong>Created:</strong> ${this.formatDate(device.createdAt)}</p>
          <p><strong>Updated:</strong> ${this.formatDate(device.updatedAt)}</p>
        </div>
      `,
      buttons: ['Close']
    });
    await alert.present();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 5000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}
