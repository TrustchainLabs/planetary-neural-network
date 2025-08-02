import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../shared/services/auth.service';
import { Observable } from 'rxjs';
import { LoadingOverlayComponent } from '../../components/common/loading-overlay/loading-overlay.component';
import { LoginFormComponent } from '../../components/auth/login-form/login-form.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    LoadingOverlayComponent,
    LoginFormComponent
  ],
  template: `
    <ion-content>
      <app-loading-overlay *ngIf="(isLoggedIn$ | async) || isLoading"></app-loading-overlay>
      <div *ngIf="!(isLoggedIn$ | async) && !isLoading" class="container">
        <app-login-form></app-login-form>
      </div>
    </ion-content>
  `,
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  isLoggedIn$: Observable<boolean>;
  isLoading = false;

  constructor(private authService: AuthService) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
  }
}
