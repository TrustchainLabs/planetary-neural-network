import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, PopoverController } from '@ionic/angular';
import { AuthService } from '../../../shared/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div
      class="container"
      [ngClass]="className"
      (click)="presentPopover($event)"
    >
      <div class="user-avatar">
        <ion-icon name="person" size="large"></ion-icon>
      </div>
      <div class="user-info">
        <div class="user-name">{{ currentUser?.email?.substring(0, 2).toUpperCase() || 'GU' }}</div>
      </div>
    </div>
  `,
  styleUrls: ['./user-tab.component.scss']
})
export class UserTabComponent {
  @Input() className: string = '';

  currentUser = this.authService.getCurrentUser();

  constructor(
    private authService: AuthService,
    private router: Router,
    private popoverController: PopoverController
  ) {}

  async presentPopover(event: any) {
    const popover = await this.popoverController.create({
      component: UserMenuPopoverComponent,
      event: event,
      translucent: true,
      cssClass: 'user-menu-popover'
    });

    await popover.present();

    const { data } = await popover.onDidDismiss();
    if (data?.action === 'logout') {
      this.logout();
    }
  }

  async logout() {
    try {
      await this.authService.logout().toPromise();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout on client side if server fails
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-list>
      <ion-item button (click)="selectAction('profile')">
        <ion-icon name="person-outline" slot="start"></ion-icon>
        <ion-label>Profile</ion-label>
      </ion-item>
      <ion-item button (click)="selectAction('settings')">
        <ion-icon name="settings-outline" slot="start"></ion-icon>
        <ion-label>Settings</ion-label>
      </ion-item>
      <ion-item button (click)="selectAction('logout')" class="logout-item">
        <ion-icon name="log-out-outline" slot="start"></ion-icon>
        <ion-label>Logout</ion-label>
      </ion-item>
    </ion-list>
  `,
  styles: [`
    ion-list {
      background: var(--background-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
    }

    ion-item {
      --background: transparent;
      --color: var(--text-color);
      --border-color: var(--border-color);

      &.logout-item {
        --color: #ff6b6b;
      }

      ion-icon {
        color: var(--text-color);
      }

      &.logout-item ion-icon {
        color: #ff6b6b;
      }
    }
  `]
})
export class UserMenuPopoverComponent {
  constructor(private popoverController: PopoverController) {}

  selectAction(action: string) {
    this.popoverController.dismiss({
      action: action
    });
  }
}
