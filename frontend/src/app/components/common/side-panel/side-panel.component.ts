import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div
      class="container"
      [class.container-right]="position === 'right'"
      [class.container-left]="position === 'left'"
      [ngStyle]="style"
    >
      <div
        class="panel"
        [class.panel-open]="isOpen"
        [class.panel-close]="!isOpen"
        [ngClass]="className"
      >
        <ng-content></ng-content>
      </div>
      <ion-icon
        name="chevron-back"
        class="nav-icon"
        [class.nav-icon-right]="(!isOpen && position === 'left') || (isOpen && position === 'right')"
        [class.nav-icon-left]="(isOpen && position === 'left') || (!isOpen && position === 'right')"
        (click)="togglePanelView()"
      ></ion-icon>
    </div>
  `,
  styleUrls: ['./side-panel.component.scss']
})
export class SidePanelComponent {
  @Input() className: string = '';
  @Input() position: 'left' | 'right' = 'left';
  @Input() style: { [key: string]: string } = {};

  isOpen = true;

  togglePanelView() {
    this.isOpen = !this.isOpen;
  }
}
