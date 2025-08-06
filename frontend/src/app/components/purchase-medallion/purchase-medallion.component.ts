import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { GeoMedallionsService, PurchaseMedallionRequest } from '../../shared/services/geo-medallions.service';

@Component({
  selector: 'app-purchase-medallion',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  template: `
    <div class="purchase-medallion">
      <div class="header">
        <h2>Purchase Medallion</h2>
        <p>Acquire territorial access rights for IoT device placement</p>
      </div>

      <div *ngIf="selectedMedallion" class="medallion-info">
        <div class="info-card">
          <div class="medallion-header">
            <h3>{{ selectedMedallion.hexId }}</h3>
            <ion-badge color="success">Available</ion-badge>
          </div>

          <div class="medallion-details">
            <div class="detail-row">
              <span class="label">Location:</span>
              <span class="value">{{ selectedMedallion.center[0].toFixed(4)}}, {{ selectedMedallion.center[1].toFixed(4) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Price:</span>
              <span class="value price">{{ selectedMedallion.price }} HBAR</span>
            </div>
            <div class="detail-row">
              <span class="label">Territory:</span>
              <span class="value">5km radius hexagonal area</span>
            </div>
          </div>
        </div>
      </div>

      <div class="content">
        <form [formGroup]="purchaseForm" (ngSubmit)="onSubmit()" class="form">
          <div class="form-section">
            <h3>Payment Information</h3>

            <ion-item>
              <ion-label position="stacked">Your Wallet Address *</ion-label>
              <ion-input
                type="text"
                formControlName="buyerAddress"
                placeholder="0.0.xxxxx"
              ></ion-input>
            </ion-item>
            <div *ngIf="purchaseForm.get('buyerAddress')?.invalid && purchaseForm.get('buyerAddress')?.touched" class="error-message">
              Please enter a valid Hedera wallet address
            </div>

            <ion-item>
              <ion-label position="stacked">Payment Transaction ID *</ion-label>
              <ion-input
                type="text"
                formControlName="paymentTransactionId"
                placeholder="0.0.xxxxx@xxxxxxxxx.xxxxxxxxx"
              ></ion-input>
            </ion-item>
            <div *ngIf="purchaseForm.get('paymentTransactionId')?.invalid && purchaseForm.get('paymentTransactionId')?.touched" class="error-message">
              Please provide the payment transaction ID
            </div>
          </div>

          <div class="form-actions">
            <ion-button
              type="submit"
              expand="block"
              fill="solid"
              color="primary"
              [disabled]="purchaseForm.invalid || isPurchasing"
            >
              <ion-spinner *ngIf="isPurchasing" name="crescent" slot="start"></ion-spinner>
              {{ isPurchasing ? 'Processing Purchase...' : 'Complete Purchase' }}
            </ion-button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['./purchase-medallion.component.scss']
})
export class PurchaseMedallionComponent implements OnInit, OnDestroy {
  @Input() selectedHexagon?: any; // Input for selected hexagon
  @Output() purchaseComplete = new EventEmitter<any>();

  purchaseForm: FormGroup;
  selectedMedallion?: any;
  isPurchasing = false;
  private medallionPreFillListener?: (event: any) => void;

  constructor(
    private fb: FormBuilder,
    private geoMedallionsService: GeoMedallionsService,
    private toastController: ToastController
  ) {
    this.purchaseForm = this.fb.group({
      buyerAddress: ['', [Validators.required, this.hederaAddressValidator]],
      paymentTransactionId: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.setupMedallionPreFillListener();

    // Set selected medallion from input
    if (this.selectedHexagon) {
      this.selectedMedallion = this.selectedHexagon;
    }
  }

  ngOnDestroy() {
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

  preFillMedallion(medallionData: any) {
    console.log('Pre-filling medallion for purchase:', medallionData);
    this.selectedMedallion = medallionData;
  }

  hederaAddressValidator(control: any) {
    if (!control.value) return null;

    const hederaRegex = /^0\.0\.\d+$/;
    if (!hederaRegex.test(control.value)) {
      return { invalidHederaAddress: true };
    }

    return null;
  }

  async onSubmit() {
    if (this.purchaseForm.invalid || !this.selectedMedallion) {
      return;
    }

    this.isPurchasing = true;

    try {
      const formValue = this.purchaseForm.value;
      const purchaseRequest: PurchaseMedallionRequest = {
        buyerAddress: formValue.buyerAddress,
        paymentTransactionId: formValue.paymentTransactionId
      };

      console.log('Purchasing medallion:', this.selectedMedallion.hexId, purchaseRequest);

      const result = await this.geoMedallionsService.purchaseMedallion(
        this.selectedMedallion.hexId,
        purchaseRequest
      ).toPromise();

      console.log('Purchase successful:', result);

      await this.showSuccess(`Medallion ${this.selectedMedallion.hexId} purchased successfully! NFT minting in progress.`);

      // Reset form
      this.purchaseForm.reset();
      this.selectedMedallion = undefined;

      // Emit purchase complete event
      this.purchaseComplete.emit(result);

    } catch (error: any) {
      console.error('Purchase failed:', error);

      let errorMessage = 'Failed to purchase medallion. Please try again.';
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      await this.showError(errorMessage);
    } finally {
      this.isPurchasing = false;
    }
  }

  private async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 5000,
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
