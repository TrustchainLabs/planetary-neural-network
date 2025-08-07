import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabName } from '../../../shared/enums';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div
      class="container"
      [class.active]="active"
      [ngClass]="className"
      (click)="onTabClick()"
      [title]="tooltip"
    >
      <ion-icon [name]="icon"></ion-icon>
    </div>
  `,
  styleUrls: ['./tab.component.scss']
})
export class TabComponent {
  @Input() className: string = '';
  @Input() name!: TabName;
  @Input() tooltip?: string;
  @Input() icon: string = '';
  @Input() alt!: string;
  @Input() active: boolean = false;
  @Output() tabClick = new EventEmitter<TabName>();

  onTabClick() {
    this.tabClick.emit(this.name);
  }
}
