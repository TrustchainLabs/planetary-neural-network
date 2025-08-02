import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SidePanelComponent } from '../common/side-panel/side-panel.component';
import { LeftPanelContentComponent } from '../left-panel-content/left-panel-content.component';
import { Feature } from '../../shared/types';
import { TabName } from '../../shared/enums';
import * as dayjs from 'dayjs';

@Component({
  selector: 'app-left-panel',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    SidePanelComponent,
    LeftPanelContentComponent
  ],
  template: `
    <app-side-panel
      className="panel"
      position="left"
      [style]="{ left: '110px' }"
    >
      <div class="top" *ngIf="selectedTab !== TabName.ADD_DEVICE">
        <div class="title" *ngIf="selectedNode?.properties['uuid']">
          <div class="title-key">Device</div>
          <div class="title-value">{{ selectedNode.properties['uuid'] }}</div>
        </div>

                <div class="date-range">
          <ion-button
            fill="outline"
            size="small"
            (click)="setDateRange('7d')"
            [class.active]="isActiveRange('7d')"
          >7D</ion-button>
          <ion-button
            fill="outline"
            size="small"
            (click)="setDateRange('30d')"
            [class.active]="isActiveRange('30d')"
          >30D</ion-button>
          <ion-button
            fill="outline"
            size="small"
            (click)="setDateRange('90d')"
            [class.active]="isActiveRange('90d')"
          >90D</ion-button>
        </div>
      </div>

      <app-left-panel-content
        [selectedNode]="selectedNode"
        [dateRange]="dateRange"
        [selectedTab]="selectedTab"
      ></app-left-panel-content>
    </app-side-panel>
  `,
  styleUrls: ['./left-panel.component.scss']
})
export class LeftPanelComponent implements OnInit {
  @Input() selectedNode?: Feature;
  @Input() selectedTab!: TabName;

  TabName = TabName;
  startDateISO!: string;
  endDateISO!: string;
  maxDateISO!: string;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs().subtract(7, 'days'), dayjs()];

  ngOnInit() {
    // Set default date range
    this.dateRange = [dayjs().subtract(7, 'days'), dayjs()];
    this.updateDateStrings();
  }

  private updateDateStrings() {
    this.startDateISO = this.dateRange[0].toISOString();
    this.endDateISO = this.dateRange[1].toISOString();
    this.maxDateISO = dayjs().toISOString();
  }

  setDateRange(range: '7d' | '30d' | '90d') {
    const now = dayjs();
    switch (range) {
      case '7d':
        this.dateRange = [now.subtract(7, 'days'), now];
        break;
      case '30d':
        this.dateRange = [now.subtract(30, 'days'), now];
        break;
      case '90d':
        this.dateRange = [now.subtract(90, 'days'), now];
        break;
    }
    this.updateDateStrings();
  }

  isActiveRange(range: '7d' | '30d' | '90d'): boolean {
    const now = dayjs();
    const diffDays = now.diff(this.dateRange[0], 'days');

    switch (range) {
      case '7d': return diffDays >= 6 && diffDays <= 8;
      case '30d': return diffDays >= 29 && diffDays <= 31;
      case '90d': return diffDays >= 89 && diffDays <= 91;
      default: return false;
    }
  }
}
