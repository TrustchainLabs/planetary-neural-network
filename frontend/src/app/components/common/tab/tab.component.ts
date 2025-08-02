import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabName } from '../../../shared/enums';

@Component({
  selector: 'app-tab',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="container"
      [class.active]="active"
      [ngClass]="className"
      (click)="onTabClick()"
      [title]="tooltip"
    >
      <img
        class="icon"
        [src]="src"
        [alt]="alt"
        width="18"
        height="16"
      />
    </div>
  `,
  styleUrls: ['./tab.component.scss']
})
export class TabComponent {
  @Input() className: string = '';
  @Input() name!: TabName;
  @Input() tooltip?: string;
  @Input() src!: string;
  @Input() alt!: string;
  @Input() active: boolean = false;
  @Output() tabClick = new EventEmitter<TabName>();

  onTabClick() {
    this.tabClick.emit(this.name);
  }
}
