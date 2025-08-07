import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GeoMedallionsService, CreateMedallionRequest } from '../../shared/services/geo-medallions.service';

@Component({
  selector: 'app-geo-medallion-creation',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  template: `
    <div class="geo-medallion-creation">
      <div class="header">
        <h2>Create Geo Medallion</h2>
        <p>Register new hexagonal areas for sale on the map</p>
      </div>

      <div class="content">
        <form [formGroup]="medallionForm" (ngSubmit)="onSubmit()">
          <div class="form-section">
            <h3>Location</h3>
            <div class="location-selection">
              <ion-button
                fill="outline"
                expand="block"
                (click)="toggleCoordinateSelection()"
                [color]="isSelectingCoordinates ? 'danger' : 'primary'"
                class="select-from-map-button"
              >
                <ion-icon [name]="isSelectingCoordinates ? 'close' : 'location-outline'" slot="start"></ion-icon>
                {{ isSelectingCoordinates ? 'Cancel Map Selection' : 'Select from Map' }}
              </ion-button>
            </div>
            <div class="coordinates-grid">
              <ion-item>
                <ion-label position="stacked">Latitude</ion-label>
                <ion-input
                  type="number"
                  step="any"
                  placeholder="40.7128"
                  formControlName="latitude"
                  [class.ion-invalid]="isFieldInvalid('latitude')"
                ></ion-input>
                <ion-note slot="error" *ngIf="isFieldInvalid('latitude')">
                  Please enter a valid latitude between -90 and 90
                </ion-note>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Longitude</ion-label>
                <ion-input
                  type="number"
                  step="any"
                  placeholder="-74.0060"
                  formControlName="longitude"
                  [class.ion-invalid]="isFieldInvalid('longitude')"
                ></ion-input>
                <ion-note slot="error" *ngIf="isFieldInvalid('longitude')">
                  Please enter a valid longitude between -180 and 180
                </ion-note>
              </ion-item>
            </div>
          </div>

          <div class="form-section">
            <h3>Medallion Details</h3>
            <ion-item>
              <ion-label position="stacked">Price (HBAR)</ion-label>
              <ion-input
                type="number"
                step="0.01"
                min="0"
                placeholder="1.00"
                formControlName="price"
                [class.ion-invalid]="isFieldInvalid('price')"
              ></ion-input>
              <ion-note slot="error" *ngIf="isFieldInvalid('price')">
                Please enter a valid price (minimum 0)
              </ion-note>
            </ion-item>

            <ion-item>
              <ion-checkbox
                formControlName="available"
                labelPlacement="end"
              >
                Available for purchase
              </ion-checkbox>
            </ion-item>
          </div>

          <div class="form-actions">
            <ion-button
              expand="block"
              type="submit"
              [disabled]="medallionForm.invalid || isCreating"
              color="primary"
            >
              <ion-spinner name="crescent" *ngIf="isCreating"></ion-spinner>
              {{ isCreating ? 'Creating...' : 'Create Medallion' }}
            </ion-button>
          </div>
        </form>
    </div>
  `,
  styleUrls: ['./geo-medallion-creation.component.scss']
})
export class GeoMedallionCreationComponent implements OnInit, OnDestroy {
  @Output() coordinateSelectionToggle = new EventEmitter<boolean>();

  medallionForm: FormGroup;
  isCreating = false;
  isSelectingCoordinates = false;
  private coordinateListener?: (event: any) => void;

  constructor(
    private fb: FormBuilder,
    private geoMedallionsService: GeoMedallionsService,
    private toastController: ToastController,
    private router: Router
  ) {
    this.medallionForm = this.fb.group({
      latitude: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: ['', [Validators.required, Validators.min(-180), Validators.max(180)]],
      price: ['', [Validators.required, Validators.min(0)]],
      available: [true]
    });
  }

  ngOnInit() {
    // Listen for coordinate selection events
    this.coordinateListener = (event: any) => {
      this.onCoordinateSelected(event.detail);
    };
    document.addEventListener('coordinateSelected', this.coordinateListener);
  }

  ngOnDestroy() {
    // Clean up event listener
    if (this.coordinateListener) {
      document.removeEventListener('coordinateSelected', this.coordinateListener);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.medallionForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  async onSubmit() {
    if (this.medallionForm.valid) {
      this.isCreating = true;

      const formValue = this.medallionForm.value;
      const createRequest: CreateMedallionRequest = {
        center: {
          latitude: parseFloat(formValue.latitude),
          longitude: parseFloat(formValue.longitude)
        },
        price: parseFloat(formValue.price),
        available: formValue.available
      };

      try {
        const result = await this.geoMedallionsService.createMedallion(createRequest).toPromise();

        await this.presentToast('Geo medallion created successfully!', 'success');

        // Reset form after successful creation
        this.medallionForm.reset({
          available: true
        });

      } catch (error: any) {
        console.error('Error creating medallion:', error);
        const errorMessage = error?.error?.message || 'Failed to create geo medallion. Please try again.';
        await this.presentToast(errorMessage, 'danger');
      } finally {
        this.isCreating = false;
      }
    }
  }

  navigateToAdmin() {
    this.router.navigate(['/admin/geo-medallions']);
  }

  toggleCoordinateSelection() {
    this.isSelectingCoordinates = !this.isSelectingCoordinates;
    this.coordinateSelectionToggle.emit(this.isSelectingCoordinates);
  }

  onCoordinateSelected(coordinates: { latitude: number; longitude: number }) {
    if (coordinates.latitude === 0 && coordinates.longitude === 0) {
      // This is the exit signal
      this.isSelectingCoordinates = false;
      return;
    }

    // Update form with selected coordinates
    this.medallionForm.patchValue({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    });

    // Exit selection mode
    this.isSelectingCoordinates = false;
    this.coordinateSelectionToggle.emit(false);

    // Show success message
    this.presentToast('Coordinates selected from map!', 'success');
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
