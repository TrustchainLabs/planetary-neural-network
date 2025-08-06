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
            [disabled]="isLoadingMedallions"
          >
            <ion-select-option *ngFor="let medallion of availableMedallions" [value]="medallion.hexId">
              {{ medallion.hexId }} - {{ medallion.price }} HBAR
            </ion-select-option>
          </ion-select>
        </ion-item>
        <div *ngIf="deviceForm.get('hexId')?.invalid && deviceForm.get('hexId')?.touched" class="error-message">
          Please select a medallion
        </div>

        <ion-item *ngIf="selectedMedallion">
          <ion-label position="stacked">Medallion Details</ion-label>
          <div class="medallion-info">
            <div class="info-row">
              <span class="label">Location:</span>
              <span class="value">{{ selectedMedallion.center.latitude.toFixed(4) }}, {{ selectedMedallion.center.longitude.toFixed(4) }}</span>
            </div>
            <div class="info-row">
              <span class="label">Price:</span>
              <span class="value">{{ selectedMedallion.price }} HBAR</span>
            </div>
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="value" [class.available]="selectedMedallion.available">{{ selectedMedallion.available ? 'Available' : 'Unavailable' }}</span>
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
            [disabled]="deviceForm.invalid || isLoading"
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
  availableMedallions: GeoMedallion[] = [];
  selectedMedallion?: GeoMedallion;
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

    this.loadAvailableMedallions();
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
      this.selectedMedallion = this.availableMedallions.find(m => m.hexId === hexId);
    });
  }

    preFillFromInput() {
    if (!this.selectedHexagon) return;

    console.log('Pre-filling medallion from input:', this.selectedHexagon);

    // Wait for medallions to load if they haven't yet
    if (this.availableMedallions.length === 0) {
      // Wait for medallions to load then try again
      setTimeout(() => this.preFillFromInput(), 500);
      return;
    }

    // Find the medallion by hexId
    const medallion = this.availableMedallions.find(m => m.hexId === this.selectedHexagon.hexId);

    if (medallion) {
      // Set the form control value
      this.deviceForm.patchValue({
        hexId: medallion.hexId
      });

      // Update selected medallion
      this.selectedMedallion = medallion;

      console.log('Medallion pre-filled successfully from input:', medallion);
    } else {
      console.warn('Medallion not found in available medallions:', this.selectedHexagon.hexId);
    }
  }

  preFillMedallion(hexagonData: any) {
    console.log('Pre-filling medallion from event (fallback):', hexagonData);

    // Wait for medallions to load if they haven't yet
    if (this.availableMedallions.length === 0) {
      // Wait for medallions to load then try again
      setTimeout(() => this.preFillMedallion(hexagonData), 500);
      return;
    }

    // Find the medallion by hexId
    const medallion = this.availableMedallions.find(m => m.hexId === hexagonData.hexId);

    if (medallion) {
      // Set the form control value
      this.deviceForm.patchValue({
        hexId: medallion.hexId
      });

      // Update selected medallion
      this.selectedMedallion = medallion;

      console.log('Medallion pre-filled successfully from event:', medallion);
    } else {
      console.warn('Medallion not found in available medallions:', hexagonData.hexId);
    }
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

  async loadAvailableMedallions() {
    this.isLoadingMedallions = true;
    try {
      this.availableMedallions = await this.geoMedallionsService.getAvailableMedallions().toPromise() || [];
      console.log('Loaded available medallions:', this.availableMedallions.length);
    } catch (error) {
      console.error('Failed to load available medallions:', error);
      await this.showError('Failed to load available medallions. Please try again.');
    } finally {
      this.isLoadingMedallions = false;
    }
  }

  async refreshMedallions() {
    await this.loadAvailableMedallions();
  }

  async onSubmit() {
    if (this.deviceForm.valid) {
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
        await this.loadAvailableMedallions();

      } catch (error: any) {
        console.error('Device registration failed:', error);
        const errorMessage = error.error?.message || error.message || 'Device registration failed. Please try again.';
        await this.showError(errorMessage);
      } finally {
        this.isLoading = false;
      }
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
