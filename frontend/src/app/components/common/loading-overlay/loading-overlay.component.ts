import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [IonicModule],
  template: `
    <div class="container">
      <ion-spinner name="crescent" color="primary"></ion-spinner>
    </div>
  `,
  styleUrls: ['./loading-overlay.component.scss']
})
export class LoadingOverlayComponent {}
