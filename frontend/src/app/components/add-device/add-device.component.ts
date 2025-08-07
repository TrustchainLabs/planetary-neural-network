import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { NodesService } from '../../shared/services/nodes.service';
import { GeoMedallionsService, GeoMedallion } from '../../shared/services/geo-medallions.service';
import { AuthService } from '../../shared/services/auth.service';
import { WalletConnectService } from '../../services/wallet-connect.service';

@Component({
  selector: 'app-add-device',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  template: `
    <div class="add-device">
      <div class="header">
        <h2>Add New Device</h2>
        <p>Register a new IoT climate monitoring device on a medallion</p>
      </div>

      <form [formGroup]="deviceForm" (ngSubmit)="onSubmit()" class="form">
        <ion-item>
          <ion-label position="stacked">Device Name *</ion-label>
          <ion-input
            type="text"
            formControlName="name"
            placeholder="Enter device name"
          ></ion-input>
        </ion-item>
        <div *ngIf="deviceForm.get('name')?.invalid && deviceForm.get('name')?.touched" class="error-message">
          Please enter a valid device name (minimum 3 characters)
        </div>

        <ion-item>
          <ion-label position="stacked">Select Medallion *</ion-label>
          <ion-select
            formControlName="hexId"
            placeholder="Choose a medallion"
            [disabled]="isLoadingMedallions || !selectedMedallion"
          >
            <ion-select-option
              *ngIf="selectedMedallion"
              [value]="selectedMedallion.hexId"
            >
              {{ selectedMedallion.hexId }} - {{ selectedMedallion.price }} HBAR
            </ion-select-option>
            <ion-select-option
              *ngIf="!selectedMedallion && !isLoadingMedallions"
              value=""
              disabled
            >
              No medallion available for this location
            </ion-select-option>
          </ion-select>
        </ion-item>
        <div *ngIf="deviceForm.get('hexId')?.invalid && deviceForm.get('hexId')?.touched" class="error-message">
          Please select a medallion
        </div>
        <div *ngIf="!selectedMedallion && !isLoadingMedallions" class="error-message">
          No medallion is available for this location. Please select a different hexagon or try refreshing.
        </div>

        <ion-item *ngIf="selectedMedallion">
          <ion-label position="stacked">Medallion Details</ion-label>
          <div class="medallion-info">
            <div class="info-row" *ngIf="selectedMedallion.center">
              <span class="label">Location:</span>
              <span class="value">{{ selectedMedallion.center.latitude?.toFixed(4) }}, {{ selectedMedallion.center.longitude?.toFixed(4) }}</span>
            </div>
            <div class="info-row">
              <span class="label">Price:</span>
              <span class="value">{{ selectedMedallion.price || 'N/A' }} HBAR</span>
            </div>
            <div class="info-row">
              <span class="label">Owner:</span>
              <span class="value">{{ selectedMedallion.ownerAddress || 'N/A' }}</span>
            </div>
          </div>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Owner Address</ion-label>
          <ion-input
            type="text"
            formControlName="owner"
            placeholder="Your wallet address (0.0.xxxxx)"
          ></ion-input>
        </ion-item>
        <div *ngIf="deviceForm.get('owner')?.invalid && deviceForm.get('owner')?.touched" class="error-message">
          Please enter a valid Hedera account address
        </div>

        <div class="form-actions">
          <ion-button
            expand="block"
            type="submit"
            [disabled]="deviceForm.invalid || isLoading || !selectedMedallion"
            class="submit-button"
          >
            <ion-spinner *ngIf="isLoading" name="crescent"></ion-spinner>
            <span *ngIf="!isLoading">Add Device</span>
          </ion-button>

          <ion-button
            expand="block"
            fill="outline"
            type="button"
            (click)="refreshMedallions()"
            [disabled]="isLoadingMedallions"
            class="refresh-button"
          >
            <ion-spinner *ngIf="isLoadingMedallions" name="crescent"></ion-spinner>
            <span *ngIf="!isLoadingMedallions">Refresh Medallions</span>
          </ion-button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./add-device.component.scss']
})
export class AddDeviceComponent implements OnInit, OnDestroy {
  @Input() selectedHexagon?: any; // Input for selected hexagon

  deviceForm!: FormGroup;
  isLoading = false;
  isLoadingMedallions = false;
  selectedMedallion: GeoMedallion | undefined;
  private medallionPreFillListener?: (event: any) => void;

  constructor(
    private formBuilder: FormBuilder,
    private nodesService: NodesService,
    private geoMedallionsService: GeoMedallionsService,
    private authService: AuthService,
    private walletConnectService: WalletConnectService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.deviceForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      hexId: ['', [Validators.required]],
      owner: ['', [this.hederaAddressValidator]]
    });

    this.loadMedallions();
    this.setupFormListeners();
    this.setupMedallionPreFillListener();

    // Pre-fill medallion from input
    if (this.selectedHexagon) {
      this.preFillFromInput();
    }
  }

  ngOnDestroy() {
    // Clean up event listener
    if (this.medallionPreFillListener) {
      document.removeEventListener('medallionPreFill', this.medallionPreFillListener);
    }
  }

  private setupMedallionPreFillListener() {
    this.medallionPreFillListener = (event: any) => {
      this.preFillMedallion(event.detail);
    };
    document.addEventListener('medallionPreFill', this.medallionPreFillListener);
  }

  private setupFormListeners() {
    this.deviceForm.get('hexId')?.valueChanges.subscribe(hexId => {
      // The selectedMedallion should be updated when the medallion is loaded, not here
      // This subscription can be used for other form-related logic if needed
      console.log('Selected hexId changed:', hexId);
    });
  }

  preFillFromInput() {
    if (!this.selectedHexagon) {
      console.warn('No selected hexagon available for pre-filling');
      return;
    }

    console.log('Pre-filling medallion from input:', this.selectedHexagon);

    // Wait for medallions to load if they're still loading
    if (this.isLoadingMedallions) {
      setTimeout(() => this.preFillFromInput(), 500);
      return;
    }

    // If no medallion is available after loading, show appropriate message
    if (!this.selectedMedallion) {
      console.warn('No medallion available for pre-filling:', this.selectedHexagon.hexId);
      return;
    }

    // Set the form control value
    this.deviceForm.patchValue({
      hexId: this.selectedMedallion.hexId
    });

    console.log('Medallion pre-filled successfully from input:', this.selectedMedallion);
  }

  preFillMedallion(hexagonData: any) {
    if (!hexagonData?.hexId) {
      console.warn('Invalid hexagon data for pre-filling:', hexagonData);
      return;
    }

    console.log('Pre-filling medallion from event (fallback):', hexagonData);

    // Wait for medallions to load if they're still loading
    if (this.isLoadingMedallions) {
      setTimeout(() => this.preFillMedallion(hexagonData), 500);
      return;
    }

    // If no medallion is available after loading, show appropriate message
    if (!this.selectedMedallion) {
      console.warn('No medallion available for pre-filling:', hexagonData.hexId);
      return;
    }

    // Set the form control value
    this.deviceForm.patchValue({
      hexId: this.selectedMedallion.hexId
    });

    console.log('Medallion pre-filled successfully from event:', this.selectedMedallion);
  }

  hederaAddressValidator(control: any) {
    if (!control.value) return null;

    // Basic Hedera account validation (0.0.xxxxx format)
    const hederaRegex = /^0\.0\.\d+$/;
    if (!hederaRegex.test(control.value)) {
      return { invalidHederaAddress: true };
    }

    return null;
  }

  async loadMedallions() {
    this.isLoadingMedallions = true;
    this.selectedMedallion = undefined;

    try {
      if (!this.selectedHexagon?.hexId) {
        console.warn('No selected hexagon available for medallion loading');
        await this.showError('No hexagon selected. Please select a hexagon on the map first.');
        return;
      }

      const response = await this.geoMedallionsService.getMedallion(this.selectedHexagon.hexId).toPromise();

      if (!response) {
        console.warn('No medallion found for hexagon:', this.selectedHexagon.hexId);
        await this.showError('No medallion found for this location. The hexagon may not have been minted yet.');
        return;
      }

      this.selectedMedallion = response as GeoMedallion;
      console.log('Loaded medallion:', this.selectedMedallion);

    } catch (error) {
      console.error('Failed to load medallion:', error);
      await this.showError('Failed to load medallion data. Please try again or select a different location.');
    } finally {
      this.isLoadingMedallions = false;
    }
  }

  async refreshMedallions() {
    await this.loadMedallions();
  }

  async onSubmit() {
    if (!this.deviceForm.valid) {
      return;
    }

    if (!this.selectedMedallion) {
      await this.showError('No medallion is selected. Please select a valid medallion first.');
      return;
    }

    this.isLoading = true;
    try {
      const formValue = this.deviceForm.value;

      // Get current user's wallet address if available
      let ownerAddress = formValue.owner;
      if (!ownerAddress) {
        // Try to get from wallet service
        const session = this.walletConnectService.getSelectedSession();
        if (session?.wallet) {
          ownerAddress = session.wallet;
        }
      }

      if (!ownerAddress) {
        await this.showError('No wallet address provided. Please enter an owner address or connect your wallet.');
        return;
      }

      // Create device using the new backend structure
      const device = await this.nodesService.createDevice({
        name: formValue.name,
        hexId: formValue.hexId,
        owner: ownerAddress
      }).toPromise();

      await this.showSuccess(`Device "${formValue.name}" registered successfully on medallion ${formValue.hexId}!`);

      // Reset form and refresh medallions
      this.deviceForm.reset();
      this.selectedMedallion = undefined;
      await this.loadMedallions();

    } catch (error: any) {
      console.error('Device registration failed:', error);
      const errorMessage = error.error?.message || error.message || 'Device registration failed. Please try again.';
      await this.showError(errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  private async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }
}
