import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div
      class="container wallet-button"
      [ngClass]="className"
      (click)="navigateToLogin()"
    >
      <div class="wallet-icon">
        <ion-icon name="wallet-outline" size="large"></ion-icon>
      </div>
    </div>
  `,
  styleUrls: ['./user-tab.component.scss']
})
export class UserTabComponent {
  @Input() className: string = '';

  constructor(
    private router: Router
  ) {}

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
