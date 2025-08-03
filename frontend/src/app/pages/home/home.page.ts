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
import { MapComponent, PurchaseRequest } from '../../components/map/map.component';

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
            [showHexagonGrid]="showHexagonGrid"
            [ownedHexagons]="ownedHexagons"
            [hexagonSize]="hexagonSize"
            (markerSelect)="onMarkerSelect($event)"
            (hexagonPurchase)="onHexagonPurchase($event)"
            (hexagonRentRequest)="onHexagonRentRequest($event)"
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

  // Hexagon-related properties
  showHexagonGrid: boolean = true;
  ownedHexagons: string[] = [];
  hexagonSize: number = 5;

  constructor(
    private authService: AuthService,
    private nodesService: NodesService
  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
  }

  ngOnInit() {
    this.loadNodeData();
    this.loadOwnedHexagons();
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

  // Hexagon-related methods
  onHexagonPurchase(purchaseRequest: PurchaseRequest) {
    console.log('Processing hexagon purchase:', purchaseRequest);

    // Here you would typically:
    // 1. Process payment through your backend
    // 2. Update blockchain/smart contract
    // 3. Update local state

    // For now, just simulate successful purchase
    this.simulateHexagonPurchase(purchaseRequest.hexagonId);
  }

  onHexagonRentRequest(rentRequest: { hexagonId: string; ownerAddress?: string }) {
    console.log('Processing rent request:', rentRequest);

    // Here you would typically:
    // 1. Contact the owner
    // 2. Negotiate rental terms
    // 3. Process rental payment

    // For demo purposes, just log the request
    alert(`Rent request sent for Hexagon #${rentRequest.hexagonId}`);
  }

  private simulateHexagonPurchase(hexagonId: string) {
    // Simulate successful purchase
    if (!this.ownedHexagons.includes(hexagonId)) {
      this.ownedHexagons = [...this.ownedHexagons, hexagonId];

      // Show success message
      console.log(`Successfully purchased Hexagon #${hexagonId}`);

      // Here you would typically update your backend/blockchain
      this.updateOwnedHexagonsInBackend();
    }
  }

  private loadOwnedHexagons() {
    // Load owned hexagons from localStorage or backend
    const stored = localStorage.getItem('ownedHexagons');
    if (stored) {
      try {
        this.ownedHexagons = JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing owned hexagons:', e);
        this.ownedHexagons = [];
      }
    }

    // In a real app, you'd load this from your backend:
    // this.hexagonService.getOwnedHexagons().subscribe(hexagons => {
    //   this.ownedHexagons = hexagons;
    // });
  }

  private updateOwnedHexagonsInBackend() {
    // Save to localStorage for demo purposes
    localStorage.setItem('ownedHexagons', JSON.stringify(this.ownedHexagons));

    // In a real app, you'd send this to your backend:
    // this.hexagonService.updateOwnedHexagons(this.ownedHexagons).subscribe();
  }
}
