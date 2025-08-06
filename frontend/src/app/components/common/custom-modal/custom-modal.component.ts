import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

export interface ModalButton {
  text: string;
  role?: 'cancel' | 'destructive';
  color?: string;
  handler?: (data?: any) => void | boolean | Promise<void | boolean>;
}

export interface ModalInput {
  name: string;
  type: 'text' | 'number' | 'email' | 'password' | 'checkbox' | 'textarea';
  placeholder?: string;
  label?: string;
  value?: any;
  checked?: boolean;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  rows?: number; // for textarea
}

export interface ModalConfig {
  header?: string;
  subHeader?: string;
  message?: string; // HTML content supported
  type: 'confirm' | 'input' | 'info';
  inputs?: ModalInput[];
  buttons: ModalButton[];
  cssClass?: string;
}

@Component({
  selector: 'app-custom-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title *ngIf="config.header">{{ config.header }}</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="dismiss()">
            <ion-icon name="close" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="modal-content">
      <div class="modal-body">
        <div *ngIf="config.subHeader" class="sub-header">
          <h3>{{ config.subHeader }}</h3>
        </div>

        <div *ngIf="config.message" class="message" [innerHTML]="config.message"></div>

        <form *ngIf="config.type === 'input' && config.inputs" [formGroup]="form" class="modal-form">
          <div *ngFor="let input of config.inputs" class="input-group">
            <ion-item *ngIf="input.type !== 'checkbox'">
              <ion-label position="stacked" *ngIf="input.label">{{ input.label }}</ion-label>
              <ion-input
                *ngIf="input.type !== 'textarea'"
                [type]="input.type"
                [placeholder]="input.placeholder"
                [formControlName]="input.name"
                [min]="input.min"
                [max]="input.max"
                [step]="input.step"
                [disabled]="input.disabled"
                [class.ion-invalid]="isFieldInvalid(input.name)"
              ></ion-input>
              <ion-textarea
                *ngIf="input.type === 'textarea'"
                [placeholder]="input.placeholder"
                [formControlName]="input.name"
                [rows]="input.rows || 3"
                [disabled]="input.disabled"
                [class.ion-invalid]="isFieldInvalid(input.name)"
              ></ion-textarea>
              <ion-note slot="error" *ngIf="isFieldInvalid(input.name)">
                This field is required
              </ion-note>
            </ion-item>

            <ion-item *ngIf="input.type === 'checkbox'">
              <ion-checkbox
                [formControlName]="input.name"
                labelPlacement="end"
                [disabled]="input.disabled"
              >
                {{ input.label || input.placeholder }}
              </ion-checkbox>
            </ion-item>
          </div>
        </form>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <div class="button-container">
          <ion-button
            *ngFor="let button of config.buttons"
            [fill]="button.role === 'cancel' ? 'outline' : 'solid'"
            [color]="button.color || (button.role === 'destructive' ? 'danger' : 'primary')"
            (click)="onButtonClick(button)"
            [disabled]="isSubmitDisabled(button)"
          >
            {{ button.text }}
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styleUrls: ['./custom-modal.component.scss']
})
export class CustomModalComponent implements OnInit {
  @Input() config!: ModalConfig;

  form: FormGroup;

  constructor(
    private modalController: ModalController,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({});
  }

  ngOnInit() {
    if (this.config.type === 'input' && this.config.inputs) {
      this.buildForm();
    }
  }

  private buildForm() {
    const formControls: any = {};

    this.config.inputs?.forEach(input => {
      const validators = input.required ? [Validators.required] : [];

      if (input.type === 'email') {
        validators.push(Validators.email);
      }

      if (input.type === 'number' && input.min !== undefined) {
        validators.push(Validators.min(input.min));
      }

      if (input.type === 'number' && input.max !== undefined) {
        validators.push(Validators.max(input.max));
      }

      const defaultValue = input.type === 'checkbox' ? (input.checked || false) : (input.value || '');
      formControls[input.name] = [defaultValue, validators];
    });

    this.form = this.fb.group(formControls);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isSubmitDisabled(button: ModalButton): boolean {
    // Disable submit button if form is invalid and it's not a cancel button
    if (this.config.type === 'input' && button.role !== 'cancel') {
      return this.form.invalid;
    }
    return false;
  }

  async onButtonClick(button: ModalButton) {
    console.log('CustomModal: Button clicked:', button);
    let data = undefined;

    if (this.config.type === 'input' && button.role !== 'cancel') {
      data = this.form.value;
      console.log('CustomModal: Form data:', data);
    }

    if (button.handler) {
      console.log('CustomModal: Calling button handler');
      const result = await button.handler(data);
      console.log('CustomModal: Handler result:', result);

      if (result !== false) {
        // For confirm modals, pass the handler result as the data
        const dismissData = this.config.type === 'confirm' ? result : data;
        console.log('CustomModal: Dismissing with data:', dismissData);
        this.dismiss(dismissData);
      } else {
        console.log('CustomModal: Handler returned false, not dismissing');
      }
    } else {
      console.log('CustomModal: No handler, dismissing with role data');
      // For buttons without handlers, pass the role for identification
      const dismissData = button.role === 'cancel' ? false : data;
      this.dismiss(dismissData);
    }
  }

    dismiss(data?: any) {
    console.log('CustomModal: dismiss called with data:', data);
    this.modalController.dismiss(data);
  }
}
