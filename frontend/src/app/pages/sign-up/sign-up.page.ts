import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IonicModule
  ],
  template: `
    <ion-content>
      <div class="container">
        <div class="title">
          <img
            src="assets/images/brand-logo.svg"
            alt="Brand Logo"
            width="32"
            height="32"
          />
          <img
            src="assets/images/brand-title.svg"
            alt="Brand Title"
            width="240"
            height="40"
          />
        </div>

        <form [formGroup]="signUpForm" (ngSubmit)="onSubmit()" class="signup-form">
          <ion-item>
            <ion-label position="stacked">Username</ion-label>
            <ion-input
              type="text"
              formControlName="username"
              placeholder="Enter your username"
            ></ion-input>
          </ion-item>
          <div *ngIf="signUpForm.get('username')?.invalid && signUpForm.get('username')?.touched" class="error-message">
            Please enter a valid username
          </div>

          <ion-item>
            <ion-label position="stacked">Email</ion-label>
            <ion-input
              type="email"
              formControlName="email"
              placeholder="Enter your email"
            ></ion-input>
          </ion-item>
          <div *ngIf="signUpForm.get('email')?.invalid && signUpForm.get('email')?.touched" class="error-message">
            Please enter a valid email
          </div>

          <ion-item>
            <ion-label position="stacked">Password</ion-label>
            <ion-input
              type="password"
              formControlName="password"
              placeholder="Enter your password"
            ></ion-input>
          </ion-item>
          <div *ngIf="signUpForm.get('password')?.invalid && signUpForm.get('password')?.touched" class="error-message">
            Password must be at least 6 characters long
          </div>

          <ion-button
            expand="block"
            type="submit"
            [disabled]="signUpForm.invalid || isLoading"
            class="submit-button"
          >
            <ion-spinner *ngIf="isLoading" name="crescent"></ion-spinner>
            <span *ngIf="!isLoading">Sign Up</span>
          </ion-button>

          <div class="login-link">
            Already have an account?
            <a routerLink="/login" class="link">Login here</a>
          </div>
        </form>
      </div>
    </ion-content>
  `,
  styleUrls: ['./sign-up.page.scss']
})
export class SignUpPage implements OnInit {
  signUpForm!: FormGroup;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.signUpForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onSubmit() {
    if (this.signUpForm.valid) {
      this.isLoading = true;
      try {
        const formValue = this.signUpForm.value;
        await this.authService.signUp({
          username: formValue.username,
          email: formValue.email,
          password: formValue.password
        }).toPromise();

        const toast = await this.toastController.create({
          message: 'Account created successfully! Please login.',
          duration: 3000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();

        this.router.navigate(['/login']);
      } catch (error) {
        console.error('Sign up failed:', error);
        const toast = await this.toastController.create({
          message: 'Sign up failed. Please try again.',
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
