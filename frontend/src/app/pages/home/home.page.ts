import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NodesService } from '../../shared/services/nodes.service';
import { AuthService } from '../../shared/services/auth.service';
import { FeatureCollection, Feature, Node } from '../../shared/types';
import { TabName } from '../../shared/enums';
import { convertToPointGeoJson } from '../../shared/helpers';
import { Observable } from 'rxjs';
import { LoadingOverlayComponent } from '../../components/common/loading-overlay/loading-overlay.component';
import { LeftNavComponent } from '../../components/navigation/left-nav/left-nav.component';
import { LeftPanelComponent } from '../../components/left-panel/left-panel.component';
import { MapComponent } from '../../components/map/map.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    LoadingOverlayComponent,
    LeftNavComponent,
    LeftPanelComponent,
    MapComponent
  ],
  template: `
    <ion-content>
      <app-loading-overlay *ngIf="!(isLoggedIn$ | async)"></app-loading-overlay>

      <div *ngIf="isLoggedIn$ | async" class="container">
        <app-left-nav
          [selectedTab]="selectedTab"
          (tabSelect)="onTabSelect($event)"
        ></app-left-nav>

        <app-left-panel
          [selectedNode]="selectedNode"
          [selectedTab]="selectedTab"
        ></app-left-panel>

        <div class="map-container">
          <app-map
            [markerGeojson]="nodeData"
            (markerSelect)="onMarkerSelect($event)"
          ></app-map>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit {
  isLoggedIn$: Observable<boolean>;
  nodeData?: FeatureCollection;
  selectedNode?: Feature;
  selectedTab: TabName = TabName.TEMPERATURE;

  constructor(
    private authService: AuthService,
    private nodesService: NodesService
  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
  }

  ngOnInit() {
    this.loadNodeData();
  }

  async loadNodeData() {
    try {
      const nodes = await this.nodesService.getNodes({ includeLatestMeasurement: true }).toPromise();
      if (nodes) {
        this.nodeData = convertToPointGeoJson(nodes);
      }
    } catch (error) {
      console.error('Failed to load node data:', error);
    }
  }

  onTabSelect(tab: TabName) {
    this.selectedTab = tab;
  }

  onMarkerSelect(feature?: Feature) {
    this.selectedNode = feature;
  }
}
