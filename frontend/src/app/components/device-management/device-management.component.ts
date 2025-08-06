import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { NodesService, Device } from '../../shared/services/nodes.service';
import { CustomModalService } from '../../services/custom-modal.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-device-management',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="device-management">
      <div class="header">
        <h2>Device Management</h2>
        <p *ngIf="!selectedMedallionHexId">Start and stop your IoT climate monitoring devices</p>
        <p *ngIf="selectedMedallionHexId">Managing devices for medallion {{ selectedMedallionHexId }}</p>

        <div *ngIf="selectedMedallionHexId" class="medallion-filter">
          <ion-chip color="primary">
            <ion-icon name="location-outline"></ion-icon>
            <ion-label>{{ selectedMedallionHexId }}</ion-label>
            <ion-icon name="close-circle" (click)="clearFilter()"></ion-icon>
          </ion-chip>
        </div>
      </div>

      <div class="content">
        <div *ngIf="isLoading" class="loading">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Loading devices...</p>
        </div>

        <div *ngIf="!isLoading && devices.length === 0" class="no-devices">
          <ion-icon name="warning-outline" size="large"></ion-icon>
          <h3 *ngIf="!selectedMedallionHexId">No Devices Found</h3>
          <h3 *ngIf="selectedMedallionHexId">No Devices on This Medallion</h3>
          <p *ngIf="!selectedMedallionHexId">You haven't registered any devices yet. Add a device first to manage it here.</p>
          <p *ngIf="selectedMedallionHexId">No devices are registered on medallion {{ selectedMedallionHexId }}. You can add a device to this medallion.</p>
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
                (click)="onStartDeviceClick(device)"
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
export class DeviceManagementComponent implements OnInit, OnDestroy {
  devices: Device[] = [];
  allDevices: Device[] = []; // Store all devices for filtering
  isLoading = false;
  isProcessingDevice: string | null = null;
  selectedMedallionHexId?: string;
  selectedMedallion?: any;
  private medallionFilterListener?: (event: any) => void;

  constructor(
    private nodesService: NodesService,
    private toastController: ToastController,
    private customModalService: CustomModalService
  ) {
    console.log('DeviceManagementComponent: Constructor called');
    console.log('DeviceManagementComponent: Services injected:', {
      nodesService: !!this.nodesService,
      toastController: !!this.toastController,
      customModalService: !!this.customModalService
    });
  }

  ngOnInit() {
    console.log('DeviceManagementComponent: ngOnInit called');
    this.loadDevices();
    this.setupMedallionFilterListener();
  }

  ngOnDestroy() {
    // Clean up event listener
    if (this.medallionFilterListener) {
      document.removeEventListener('medallionDeviceFilter', this.medallionFilterListener);
    }
  }

  private setupMedallionFilterListener() {
    this.medallionFilterListener = (event: any) => {
      this.filterDevicesByMedallion(event.detail.hexId, event.detail.medallion);
    };
    document.addEventListener('medallionDeviceFilter', this.medallionFilterListener);
  }

  async loadDevices() {
    console.log('DeviceManagementComponent: loadDevices called');
    this.isLoading = true;
    try {
      console.log('DeviceManagementComponent: Calling nodesService.getDevices()');
      this.allDevices = await this.nodesService.getDevices().toPromise() || [];
      console.log('DeviceManagementComponent: Loaded devices:', this.allDevices);
      this.devices = [...this.allDevices]; // Show all devices initially
      console.log('DeviceManagementComponent: Devices to display:', this.devices);
    } catch (error) {
      console.error('DeviceManagementComponent: Error loading devices:', error);
      await this.showError('Failed to load devices. Please try again.');
    } finally {
      this.isLoading = false;
      console.log('DeviceManagementComponent: loadDevices completed, isLoading set to false');
      this.logUIState();
    }
  }

  filterDevicesByMedallion(hexId: string, medallion?: any) {
    console.log('DeviceManagementComponent: Filtering devices by medallion:', hexId);
    this.selectedMedallionHexId = hexId;
    this.selectedMedallion = medallion;

    // Filter devices by the selected medallion
    this.devices = this.allDevices.filter(device => device.hexId === hexId);

    console.log(`DeviceManagementComponent: Found ${this.devices.length} devices for medallion ${hexId}`);
    this.logUIState();
  }

  clearFilter() {
    console.log('DeviceManagementComponent: Clearing medallion filter');
    this.selectedMedallionHexId = undefined;
    this.selectedMedallion = undefined;
    this.devices = [...this.allDevices]; // Show all devices
    this.logUIState();
  }

  private logUIState() {
    console.log('DeviceManagementComponent: Current UI State:', {
      isLoading: this.isLoading,
      devicesCount: this.devices.length,
      allDevicesCount: this.allDevices.length,
      selectedMedallionHexId: this.selectedMedallionHexId,
      isProcessingDevice: this.isProcessingDevice,
      devices: this.devices.map(d => ({
        deviceId: d.deviceId,
        name: d.name,
        isActive: d.isActive,
        hasPrivateKey: !!d.privateKey,
        hasHcsTopic: !!d.hcsTopic
      }))
    });
  }

  async refreshDevices() {
    console.log('DeviceManagementComponent: refreshDevices called');
    await this.loadDevices();
  }

  onStartDeviceClick(device: Device) {
    console.log('DeviceManagementComponent: START BUTTON CLICKED for device:', device);
    console.log('DeviceManagementComponent: Button click event triggered');
    this.startDevice(device);
  }

  async startDevice(device: Device) {
    console.log('DeviceManagementComponent: startDevice called for device:', device);
    console.log('DeviceManagementComponent: Device details:', {
      deviceId: device.deviceId,
      name: device.name,
      isActive: device.isActive,
      hasPrivateKey: !!device.privateKey,
      hexId: device.hexId
    });

    console.log('DeviceManagementComponent: Showing confirmation modal');
    const confirmed = await this.customModalService.presentConfirm(
      'Start Data Collection',
      `Are you sure you want to start data collection for device <strong>"${device.name}"</strong>?<br/><br/>This will begin collecting sensor data every 10 seconds and submitting analysis to the blockchain.`,
      'Start',
      'Cancel'
    );

    console.log('DeviceManagementComponent: Confirmation result:', confirmed);
    if (confirmed) {
      console.log('DeviceManagementComponent: User confirmed, calling performDeviceAction');
      this.performDeviceAction(device, 'start');
    } else {
      console.log('DeviceManagementComponent: User cancelled start operation');
    }
  }

  async stopDevice(device: Device) {
    const confirmed = await this.customModalService.presentConfirm(
      'Stop Data Collection',
      `Are you sure you want to stop data collection for device <strong>"${device.name}"</strong>?<br/><br/>This will stop collecting sensor data and process any remaining readings.`,
      'Stop',
      'Cancel'
    );

    if (confirmed) {
      this.performDeviceAction(device, 'stop');
    }
  }

  private async performDeviceAction(device: Device, action: 'start' | 'stop') {
    console.log(`DeviceManagementComponent: performDeviceAction called with action '${action}' for device:`, device);

    // Validate device configuration
    console.log('DeviceManagementComponent: Validating device configuration');
    console.log('DeviceManagementComponent: Has privateKey:', !!device.privateKey);
    console.log('DeviceManagementComponent: Has hcsTopic:', !!device.hcsTopic);

    if (!device.privateKey) {
      console.log('DeviceManagementComponent: Missing private key, showing error modal');
      await this.customModalService.presentInfo(
        'Missing Private Key',
        `Device "${device.name}" does not have a private key configured. Please update the device configuration first.`
      );
      return;
    }

    if (!device.hcsTopic) {
      console.log('DeviceManagementComponent: Missing HCS topic, showing error modal');
      await this.customModalService.presentInfo(
        'Missing HCS Topic',
        `Device "${device.name}" does not have an HCS topic configured. Please update the device configuration first.`
      );
      return;
    }

    console.log(`DeviceManagementComponent: ${action.toUpperCase()}ING device:`, {
      deviceId: device.deviceId,
      name: device.name,
      hasPrivateKey: !!device.privateKey,
      hasHcsTopic: !!device.hcsTopic,
      currentStatus: device.isActive
    });

    console.log('DeviceManagementComponent: Setting isProcessingDevice to:', device.deviceId);
    this.isProcessingDevice = device.deviceId;

    try {
      console.log('DeviceManagementComponent: Entering try block for device action');
      let response: any;

      if (action === 'start') {
        console.log(`DeviceManagementComponent: Calling startDataCollection for device ${device.deviceId}`);
        console.log('DeviceManagementComponent: nodesService:', this.nodesService);
        console.log('DeviceManagementComponent: About to call nodesService.startDataCollection with params:', {
          deviceId: device.deviceId,
          hasPrivateKey: !!device.privateKey
        });

        response = await firstValueFrom(
          this.nodesService.startDataCollection(device.deviceId, device.privateKey)
        );
        console.log('DeviceManagementComponent: startDataCollection completed');
      } else {
        console.log(`DeviceManagementComponent: Calling stopDataCollection for device ${device.deviceId}`);
        response = await firstValueFrom(
          this.nodesService.stopDataCollection(device.deviceId, device.privateKey)
        );
        console.log('DeviceManagementComponent: stopDataCollection completed');
      }

      console.log(`DeviceManagementComponent: ${action.toUpperCase()} response:`, response);

      // Update the device status from the response
      console.log('DeviceManagementComponent: Updating device status from response');
      if (response && response.hasOwnProperty('isActive')) {
        console.log('DeviceManagementComponent: Response has isActive property:', response.isActive);
        device.isActive = response.isActive;
      } else {
        console.log('DeviceManagementComponent: Response does not have isActive, using action result');
        device.isActive = action === 'start';
      }

      // Verify status with the backend
      console.log('DeviceManagementComponent: Verifying status with backend');
      try {
        const statusResponse = await firstValueFrom(
          this.nodesService.getDataCollectionStatus(device.deviceId)
        );
        console.log('DeviceManagementComponent: Device status verification response:', statusResponse);

        // Update with verified status
        if (statusResponse && statusResponse.hasOwnProperty('active')) {
          console.log('DeviceManagementComponent: Updating with verified status:', statusResponse.active);
          device.isActive = statusResponse.active;
        }
      } catch (statusError) {
        console.warn('DeviceManagementComponent: Could not verify device status:', statusError);
      }

      // Refresh the device list to get latest status from backend
      console.log('DeviceManagementComponent: Refreshing device list');
      await this.loadDevices();

      const message = action === 'start'
        ? `Data collection started for device "${device.name}" successfully!`
        : `Data collection stopped for device "${device.name}" successfully!`;

      console.log('DeviceManagementComponent: Showing success message:', message);
      await this.showSuccess(message);

    } catch (error: any) {
      console.error(`DeviceManagementComponent: Error ${action}ing device ${device.deviceId}:`, error);
      console.error('DeviceManagementComponent: Error details:', {
        type: typeof error,
        hasErrorProperty: !!error?.error,
        hasMessageProperty: !!error?.message,
        fullError: error
      });

      let errorMessage = `Failed to ${action} data collection for device "${device.name}".`;

      // Extract meaningful error message
      if (error?.error?.message) {
        console.log('DeviceManagementComponent: Using error.error.message:', error.error.message);
        errorMessage += ` Error: ${error.error.message}`;
      } else if (error?.message) {
        console.log('DeviceManagementComponent: Using error.message:', error.message);
        errorMessage += ` Error: ${error.message}`;
      } else if (typeof error === 'string') {
        console.log('DeviceManagementComponent: Using string error:', error);
        errorMessage += ` Error: ${error}`;
      }

      console.log('DeviceManagementComponent: Final error message:', errorMessage);
      await this.showError(errorMessage);
    } finally {
      console.log('DeviceManagementComponent: Finally block - resetting isProcessingDevice');
      this.isProcessingDevice = null;
    }
  }

  async viewDeviceDetails(device: Device) {
    const message = `
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
    `;

    await this.customModalService.presentInfo(device.name, message, 'Close');
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
    console.log('DeviceManagementComponent: showSuccess called with message:', message);
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    console.log('DeviceManagementComponent: Success toast created, presenting...');
    await toast.present();
    console.log('DeviceManagementComponent: Success toast presented');
  }

  private async showError(message: string) {
    console.log('DeviceManagementComponent: showError called with message:', message);
    const toast = await this.toastController.create({
      message,
      duration: 5000,
      color: 'danger',
      position: 'top'
    });
    console.log('DeviceManagementComponent: Error toast created, presenting...');
    await toast.present();
    console.log('DeviceManagementComponent: Error toast presented');
  }
}
