import { Component, OnInit } from '@angular/core';
import { DevicePartnershipService, LicorDevice } from '../../shared/services/device-partnership.service';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { LoggerUtil } from '../../../utils/logger/logger';

@Component({
  selector: 'app-available-devices',
  templateUrl: './available-devices.component.html',
  styleUrls: ['./available-devices.component.scss']
})
export class AvailableDevicesComponent implements OnInit {
  devices: LicorDevice[] = [];
  filteredDevices: LicorDevice[] = [];
  isLoading = false;
  searchTerm = '';
  selectedDeviceType = '';
  
  deviceTypes = [
    { value: '', label: 'All Device Types' },
    { value: 'LICOR_EDDY_COVARIANCE', label: 'Eddy Covariance' },
    { value: 'LICOR_SOIL_FLUX', label: 'Soil Flux' },
    { value: 'LICOR_SMART_FLUX', label: 'Smart Flux' },
    { value: 'LICOR_TRACE_GAS', label: 'Trace Gas' }
  ];

  constructor(
    private partnershipService: DevicePartnershipService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController
  ) {}

  async ngOnInit() {
    await this.loadAvailableDevices();
  }

  async loadAvailableDevices() {
    this.isLoading = true;
    
    try {
      LoggerUtil.log('📡 Loading available Licor devices...');
      this.devices = await this.partnershipService.getAvailableDevices().toPromise() || [];
      this.filteredDevices = [...this.devices];
      LoggerUtil.log(`✅ Loaded ${this.devices.length} devices`);
    } catch (error: any) {
      LoggerUtil.error('❌ Error loading devices:', error);
      await this.showToast('Failed to load devices. Please try again.', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters() {
    let filtered = [...this.devices];

    // Filter by search term (name or description)
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(device => 
        device.name.toLowerCase().includes(searchLower) ||
        device.metadata?.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by device type
    if (this.selectedDeviceType) {
      filtered = filtered.filter(device => device.deviceType === this.selectedDeviceType);
    }

    this.filteredDevices = filtered;
    LoggerUtil.log(`🔍 Filtered to ${filtered.length} devices`);
  }

  async openPurchaseModal(device: LicorDevice) {
    // TODO: Open purchase modal
    LoggerUtil.log('🛒 Opening purchase modal for:', device.name);
    await this.showToast('Purchase modal coming soon!', 'warning');
  }

  getDeviceTypeName(type: string): string {
    return this.partnershipService.formatDeviceType(type);
  }

  getAvailabilityColor(device: LicorDevice): string {
    return this.partnershipService.getAvailabilityColor(device);
  }

  getAvailabilityLabel(device: LicorDevice): string {
    return this.partnershipService.getAvailabilityLabel(device);
  }

  calculateSharePercentage(shares: number, totalShares: number): number {
    return this.partnershipService.calculateSharePercentage(shares, totalShares);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
