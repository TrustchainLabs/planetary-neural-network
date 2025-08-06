import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
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
      </div>

      <app-left-panel-content
        [selectedNode]="selectedNode"
        [dateRange]="dateRange"
        [selectedTab]="selectedTab"
        [selectedHexagon]="selectedHexagon"
        (coordinateSelectionModeChange)="onCoordinateSelectionModeChange($event)"
      ></app-left-panel-content>
    </app-side-panel>
  `,
  styleUrls: ['./left-panel.component.scss']
})
export class LeftPanelComponent implements OnInit {
  @Input() selectedNode?: Feature;
  @Input() selectedTab!: TabName;
  @Input() selectedHexagon?: any; // Add input for selected hexagon
  @Output() coordinateSelectionModeChange = new EventEmitter<boolean>();

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

  onCoordinateSelectionModeChange(isSelecting: boolean) {
    this.coordinateSelectionModeChange.emit(isSelecting);
  }
}
