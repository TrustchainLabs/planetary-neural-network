import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { NodesService } from '../../shared/services/nodes.service';
import { GeometryType } from '../../shared/enums';
import { Geometry } from '../../shared/types';

@Component({
  selector: 'app-add-device',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  template: `
    <div class="add-device">
      <form [formGroup]="deviceForm" (ngSubmit)="onSubmit()" class="form">
        <ion-item>
          <ion-label position="stacked">Name</ion-label>
          <ion-input
            type="text"
            formControlName="name"
            placeholder="Enter device name"
          ></ion-input>
        </ion-item>
        <div *ngIf="deviceForm.get('name')?.invalid && deviceForm.get('name')?.touched" class="error-message">
          Please enter a valid device name
        </div>

        <ion-item>
          <ion-label position="stacked">UUID</ion-label>
          <ion-input
            type="text"
            formControlName="uuid"
            placeholder="Enter device UUID"
          ></ion-input>
        </ion-item>
        <div *ngIf="deviceForm.get('uuid')?.invalid && deviceForm.get('uuid')?.touched" class="error-message">
          Please enter a valid device UUID
        </div>

        <ion-item>
          <ion-label position="stacked">Location (long,lat,alt)</ion-label>
          <ion-input
            type="text"
            formControlName="location"
            placeholder="e.g., 101.315,-3.042,50"
          ></ion-input>
        </ion-item>
        <div *ngIf="deviceForm.get('location')?.invalid && deviceForm.get('location')?.touched" class="error-message">
          Please enter valid coordinates (longitude,latitude,altitude)
        </div>

        <ion-button
          expand="block"
          type="submit"
          [disabled]="deviceForm.invalid || isLoading"
          class="submit-button"
        >
          <ion-spinner *ngIf="isLoading" name="crescent"></ion-spinner>
          <span *ngIf="!isLoading">Add Device</span>
        </ion-button>
      </form>
    </div>
  `,
  styleUrls: ['./add-device.component.scss']
})
export class AddDeviceComponent implements OnInit {
  deviceForm!: FormGroup;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private nodesService: NodesService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.deviceForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      uuid: ['', [Validators.required]],
      location: ['', [Validators.required, this.coordinatesValidator]]
    });
  }

  coordinatesValidator(control: any) {
    if (!control.value) return null;

    const coords = control.value.split(',').map((c: string) => c.trim());
    if (coords.length !== 3) {
      return { invalidCoordinates: true };
    }

    const [lng, lat, alt] = coords.map(Number);
    if (isNaN(lng) || isNaN(lat) || isNaN(alt)) {
      return { invalidCoordinates: true };
    }

    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return { invalidCoordinates: true };
    }

    return null;
  }

  async onSubmit() {
    if (this.deviceForm.valid) {
      this.isLoading = true;
      try {
        const formValue = this.deviceForm.value;
        const coordinates = formValue.location.split(',').map((c: string) => Number(c.trim()));

        const location: Geometry = {
          type: GeometryType.POINT,
          coordinates: coordinates as [number, number, number]
        };

        await this.nodesService.registerNode({
          name: formValue.name,
          uuid: formValue.uuid,
          location
        }).toPromise();

        const toast = await this.toastController.create({
          message: 'Device registered successfully!',
          duration: 3000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();

        this.deviceForm.reset();
      } catch (error) {
        console.error('Device registration failed:', error);
        const toast = await this.toastController.create({
          message: 'Device registration failed. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      } finally {
        this.isLoading = false;
      }
    }
  }
}
