import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, OnChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { FeatureCollection, Feature } from '../../shared/types';
import { MAPBOX_CONFIG, HASHSCAN_URL } from '../../shared/constants';
import * as turf from '@turf/turf';
// Hexagon-related interfaces
export interface HexagonData {
  id: string;
  center: [number, number]; // [lng, lat]
  vertices: [number, number][]; // Array of [lng, lat] coordinates
  isOwned: boolean;
  owner?: string;
  price?: number;
}

export interface GridBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface PurchaseRequest {
  hexagonId: string;
  paymentMethod: 'wallet' | 'crypto';
  walletAddress?: string;
}
import * as mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="map-wrapper">
      <div #mapContainer id="map" class="map-container"></div>

            <!-- Map Controls - Right Side -->
      <div class="map-controls-right">
        <ion-button
          fill="solid"
          size="small"
          (click)="toggleHexagonGrid()"
          [color]="showHexagonGrid ? 'primary' : 'medium'">
          <ion-icon name="hexagon-outline" slot="start"></ion-icon>
          {{ showHexagonGrid ? 'Hide' : 'Show' }} Grid
        </ion-button>

        <ion-button
          fill="outline"
          size="small"
          (click)="openPurchaseModal()"
          [disabled]="!showHexagonGrid">
          <ion-icon name="add-circle-outline" slot="start"></ion-icon>
          Buy Hexagon
        </ion-button>
      </div>

      <!-- Hexagon Info Panel - Right Side -->
      <div class="hexagon-info-panel" *ngIf="hoveredHexagon">
        <div class="panel-content">
          <div class="panel-header">
            <ion-icon name="hexagon-outline"></ion-icon>
            <span>{{ hoveredHexagon.id }}</span>
          </div>
          <div class="panel-details">
            <div class="price">{{ hoveredHexagon.price || 100 }} HBAR</div>
            <div class="status" [ngClass]="hoveredHexagon.isOwned ? 'owned' : 'available'">
              {{ hoveredHexagon.isOwned ? 'Owned' : 'Available' }}
            </div>
          </div>
          <div class="panel-actions">
            <ion-button
              fill="solid"
              size="small"
              color="primary"
              (click)="onHexagonClick(hoveredHexagon)"
              [disabled]="hoveredHexagon.isOwned">
              {{ hoveredHexagon.isOwned ? 'Owned' : 'Purchase' }}
            </ion-button>
          </div>
        </div>
      </div>

      <!-- Hexagonal Grid Component -->
      <!-- Will be added programmatically via the component logic -->

      <!-- Purchase Modal -->
      <!-- Will be implemented as a service-based modal -->


    </div>
  `,
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  // Hexagon grid will be implemented directly in this component

  @Input() markerGeojson?: FeatureCollection;
  @Input() showHexagonGrid: boolean = false;
  @Input() ownedHexagons: string[] = [];
  @Input() hexagonSize: number = 5; // Fixed 5km hexagons for expanded coverage

  @Output() markerSelect = new EventEmitter<Feature | undefined>();
  @Output() hexagonPurchase = new EventEmitter<PurchaseRequest>();
  @Output() hexagonRentRequest = new EventEmitter<{ hexagonId: string; ownerAddress?: string }>();

  public map!: mapboxgl.Map;
  private markers: mapboxgl.Marker[] = [];

  // Hexagon-related properties
  selectedHexagon?: string;
  selectedHexagonData?: HexagonData;
  hoveredHexagon?: HexagonData;
  popupPosition = { x: 0, y: 0 };

    // Expanded bounds for Greater Kuala Lumpur area
  gridBounds: GridBounds = {
    north: 3.35,   // Expanded northern boundary (Gombak)
    south: 2.85,   // Expanded southern boundary (Putrajaya)
    east: 102.0,   // Expanded eastern boundary (Genting direction)
    west: 101.45   // Expanded western boundary (Shah Alam)
  };

  // Hexagon grid data
  private hexagonGrid: any = null;
  private hexagons: HexagonData[] = [];
  private hexagonSourceId = 'hex-grid';
  private hexagonFillLayerId = 'hex-grid-fill';
  private hexagonOutlineLayerId = 'hex-grid-outline';
  private hexagonLabelLayerId = 'hex-grid-labels';

    // Fixed hexagon management for KL
  private isFixedGrid = true;
  private readonly KL_CENTER = { lat: 3.1319, lng: 101.6841 }; // Kuala Lumpur center

  constructor(private alertController: AlertController) {}

  ngOnInit() {
    this.initializeMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    if (this.map) {
      setTimeout(() => {
        this.map.resize();
      }, 100);
    }
  }

  ngOnChanges() {
    if (this.map && this.markerGeojson) {
      this.addMarkers(this.markerGeojson);
    }
  }

  private initializeMap() {
    // Set Mapbox access token
    (mapboxgl as any).accessToken = MAPBOX_CONFIG.ACCESS_TOKEN;

    // Initialize map with explicit container and interaction options
    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: MAPBOX_CONFIG.STYLE,
      center: MAPBOX_CONFIG.CENTER,
      zoom: MAPBOX_CONFIG.ZOOM,
      attributionControl: false,
      // Ensure all interactions are enabled
      scrollZoom: true,
      boxZoom: true,
      dragRotate: true,
      dragPan: true,
      keyboard: true,
      doubleClickZoom: true,
      touchZoomRotate: true,
      touchPitch: true,
      cooperativeGestures: false, // Disable cooperative gestures for better UX
      // Performance optimizations
      antialias: true,
    });

    // Add navigation controls (zoom in/out, rotation)
    this.map.addControl(new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true
    }), 'top-right');

    // Add fullscreen control
    this.map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Add geolocation control
    this.map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    }), 'top-right');

    // Add scale control
    this.map.addControl(new mapboxgl.ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-left');

        // Add error handling
    this.map.on('error', (e) => {
      console.error('Mapbox GL error:', e);
    });

    this.map.on('load', () => {
      console.log('Map loaded successfully');

      if (this.markerGeojson) {
        this.addMarkers(this.markerGeojson);
      }

      // Initialize fixed hexagon grid if enabled
      if (this.showHexagonGrid) {
        this.initializeHexagonGrid();
      }

      // Ensure map fills the container properly
      setTimeout(() => {
        this.map.resize();
        console.log('Map resized after load');
      }, 100);
    });

    // Handle style loading
    this.map.on('style.load', () => {
            console.log('Map style loaded successfully');
    });

    // Add interaction logging for debugging
    this.map.on('movestart', () => {
      console.log('Map move started');
    });

    this.map.on('zoomstart', () => {
      console.log('Map zoom started');
    });
  }

  private removeMarkers() {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
  }

  private addMarkers(featureCollection: FeatureCollection) {
    this.removeMarkers();

    featureCollection.features.forEach(feature => {
      const marker = this.createMarker(feature);
      marker.addTo(this.map);
      this.markers.push(marker);
    });
  }

  private createMarker(feature: Feature): mapboxgl.Marker {
    // Create popup
    const popup = this.createPopup(feature);

    // Create marker element
    const markerEl = document.createElement('img');
    markerEl.src = 'assets/icons/cloud-marker.svg';
    markerEl.alt = 'Marker';
    markerEl.style.width = '80px';
    markerEl.style.height = '80px';
    markerEl.style.cursor = 'pointer';
    markerEl.onclick = () => this.markerSelect.emit(feature);

    return new mapboxgl.Marker(markerEl, { offset: [0, -56] })
      .setLngLat([feature.geometry.coordinates[0], feature.geometry.coordinates[1]])
      .setPopup(popup);
  }

  private getElapsedTimeFromLatestTransmission(feature: Feature): string {
    if (!feature.properties?.['latestMeasurement']?.['createdAt']) {
      return 'N/A';
    }

    const now = new Date();
    const lastTransmission = new Date(feature.properties['latestMeasurement']['createdAt']);
    const diffMs = now.getTime() - lastTransmission.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m ago`;
    } else {
      return `${diffMins}m ago`;
    }
  }

  private createPopup(feature: Feature): mapboxgl.Popup {
    const measurement = feature.properties?.['latestMeasurement'];

    return new mapboxgl.Popup({ closeButton: false })
      .setHTML(`
        <div class="popup">
          <div class="popup-header">
            <img
              src="assets/icons/cloud.svg"
              alt="Device"
              width="36px"
              style="filter: brightness(0) invert(0.85);"
            />
            <div class="node">
              <div>Device</div>
              <div>|</div>
              <div>${feature.properties?.['uuid'] || 'Unknown'}</div>
            </div>
            <div class="metadata">
              <a
                href="${HASHSCAN_URL}/account/${feature.properties?.['hederaAccount'] || ''}"
                target="_blank"
                style="color: var(--secondary-color); text-decoration: none;"
              >
                Account: ${feature.properties?.['hederaAccount'] || 'N/A'}
              </a>
              <div style="color: var(--text-color);">
                ${feature.geometry?.coordinates?.join(', ') || ''}m
              </div>
              <div style="color: var(--text-color);">
                ${this.getElapsedTimeFromLatestTransmission(feature)}
              </div>
            </div>
          </div>
          <table class="popup-table">
            <tbody>
              <tr>
                <td class="popup-icon">
                  <img src="assets/icons/thermostat.svg" alt="Temperature" width="16px" style="filter: brightness(0) invert(0.85);" />
                </td>
                <td class="popup-key">Temperature</td>
                <td class="popup-value">
                  ${measurement?.temperature?.value || 'N/A'} ${measurement?.temperature?.unit || ''}
                </td>
              </tr>
              <tr>
                <td class="popup-icon">
                  <img src="assets/icons/compass.svg" alt="Compass" width="16px" style="filter: brightness(0) invert(0.85);" />
                </td>
                <td class="popup-key">Wind Direction</td>
                <td class="popup-value">
                  ${measurement?.windDirection?.value || 'N/A'} ${measurement?.windDirection?.unit || ''}
                </td>
              </tr>
              <tr>
                <td class="popup-icon">
                  <img src="assets/icons/wind.svg" alt="Wind" width="16px" style="filter: brightness(0) invert(0.85);" />
                </td>
                <td class="popup-key">Wind Speed</td>
                <td class="popup-value">
                  ${measurement?.windSpeed?.value || 'N/A'} ${measurement?.windSpeed?.unit || ''}
                </td>
              </tr>
              <tr>
                <td class="popup-icon">
                  <img src="assets/icons/gauge.svg" alt="Gauge" width="16px" style="filter: brightness(0) invert(0.85);" />
                </td>
                <td class="popup-key">Atm. Pressure</td>
                <td class="popup-value">
                  ${measurement?.atmPressure?.value || 'N/A'} ${measurement?.atmPressure?.unit || ''}
                </td>
              </tr>
              <tr>
                <td class="popup-icon">
                  <img src="assets/icons/airwave.svg" alt="Airwave" width="16px" style="filter: brightness(0) invert(0.85);" />
                </td>
                <td class="popup-key">Air Quality</td>
                <td class="popup-value">
                  ${measurement?.airQuality?.value || 'N/A'} ${measurement?.airQuality?.unit || ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `)
      .on('close', () => this.markerSelect.emit(undefined))
      .on('open', () => this.markerSelect.emit(feature));
  }

  // Hexagon grid implementation using Turf.js
  private initializeHexagonGrid() {
    this.generateHexagonGrid();
    this.addHexagonGridToMap();
    this.setupHexagonEventHandlers();
  }

  private generateHexagonGrid() {
    // Use fixed bounds for Kuala Lumpur area
    const { north, south, east, west } = this.gridBounds;
    const bbox: [number, number, number, number] = [west, south, east, north];

    console.log('Generating fixed KL hex grid with:', {
      bbox,
      cellSize: this.hexagonSize,
      area: 'Kuala Lumpur, Malaysia'
    });

    // Generate hexagonal grid using Turf.js for KL area
    this.hexagonGrid = turf.hexGrid(bbox, this.hexagonSize, {
      units: 'kilometers',
      properties: {}
    });

    console.log('KL Hexagons generated:', this.hexagonGrid.features.length);

    // Add simple sequential IDs and properties to hexagons
    this.hexagons = [];
    this.hexagonGrid.features.forEach((feature: any, index: number) => {
      const center = turf.center(feature);
      const [lng, lat] = center.geometry.coordinates;

      // Simple sequential ID for KL hexagons (KL001, KL002, etc.)
      const hexId = `KL${(index + 1).toString().padStart(3, '0')}`;

      // Add properties to the feature
      feature.properties = {
        ...feature.properties,
        id: hexId,
        isOwned: this.ownedHexagons.includes(hexId),
        isSelected: false,
        price: this.calculateKLHexagonPrice(lat, lng, index),
        district: this.getKLDistrict(lat, lng)
      };

      // Create hexagon data for our internal tracking
      const hexagonData: HexagonData = {
        id: hexId,
        center: [lng, lat],
        vertices: feature.geometry.coordinates[0],
        isOwned: this.ownedHexagons.includes(hexId),
        price: this.calculateKLHexagonPrice(lat, lng, index)
      };

      this.hexagons.push(hexagonData);
    });

    console.log(`Generated ${this.hexagons.length} fixed KL hexagons`);
  }

  // Calculate hexagon price based on KL location and premium areas
  private calculateKLHexagonPrice(lat: number, lng: number, index: number): number {
    let price = 100; // Base price in HBAR

    // Distance from KLCC (premium area)
    const klccLat = 3.1578;
    const klccLng = 101.7123;
    const distanceFromKLCC = this.calculateDistance(lat, lng, klccLat, klccLng);

    // Premium areas (closer to KLCC = more expensive)
    if (distanceFromKLCC < 2) {
      price = 500; // KLCC area - very expensive
    } else if (distanceFromKLCC < 5) {
      price = 300; // City center - expensive
    } else if (distanceFromKLCC < 10) {
      price = 200; // Greater KL - moderate
    } else {
      price = 150; // Outer areas - standard
    }

    // Add some randomization for variety
    price += Math.floor(Math.random() * 50) - 25; // ±25 HBAR variation

    return Math.max(50, price); // Minimum 50 HBAR
  }

  // Get KL district name based on coordinates
  private getKLDistrict(lat: number, lng: number): string {
    // Simple district mapping based on coordinates
    if (lat > 3.16 && lng > 101.70) return 'KLCC';
    if (lat > 3.14 && lng > 101.68) return 'Bukit Bintang';
    if (lat > 3.12 && lng < 101.68) return 'Chow Kit';
    if (lat < 3.10 && lng > 101.70) return 'Ampang';
    if (lat < 3.10 && lng < 101.68) return 'Petaling';
    return 'Greater KL';
  }

  // Calculate distance between two points in km
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private addHexagonGridToMap() {
    if (!this.hexagonGrid) return;

    // Safely remove existing layers
    [this.hexagonLabelLayerId, this.hexagonOutlineLayerId, this.hexagonFillLayerId].forEach(layerId => {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });

    // Safely remove existing source
    if (this.map.getSource(this.hexagonSourceId)) {
      this.map.removeSource(this.hexagonSourceId);
    }

    // Add the source
    this.map.addSource(this.hexagonSourceId, {
      type: 'geojson',
      data: this.hexagonGrid
    });

    // Add transparent fill layer for better hover detection
    this.map.addLayer({
      id: this.hexagonFillLayerId,
      type: 'fill',
      source: this.hexagonSourceId,
      layout: {},
      paint: {
        'fill-color': '#ffffff',
        'fill-opacity': 0.001 // Nearly invisible but interactive
      }
    });

    // Add outline layer with reduced opacity
    this.map.addLayer({
      id: this.hexagonOutlineLayerId,
      type: 'line',
      source: this.hexagonSourceId,
      layout: {},
      paint: {
        'line-color': [
          'case',
          ['get', 'isSelected'],
          '#ffff00',
          ['get', 'isOwned'],
          '#00ff00',
          '#0080ff'
        ],
        'line-width': [
          'case',
          ['get', 'isSelected'],
          2,
          ['get', 'isOwned'],
          1.5,
          1
        ],
        'line-opacity': 0.4 // Reduced opacity for subtle borders
      }
    });

    // Add labels layer for hexagon IDs with reduced visibility
    this.map.addLayer({
      id: this.hexagonLabelLayerId,
      type: 'symbol',
      source: this.hexagonSourceId,
      layout: {
        'text-field': ['get', 'id'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 10,
          10, 14,
          14, 18,
          18, 22
        ],
        'text-anchor': 'center',
        'visibility': 'none' // Initially hidden
      },
      paint: {
        'text-color': [
          'case',
          ['get', 'isSelected'],
          '#333333',
          ['get', 'isOwned'],
          '#ffffff',
          '#555555'
        ],
        'text-opacity': 0.6, // Reduced opacity for less visibility
        'text-halo-width': 0 // No halo for cleaner look
      }
    });

    this.toggleHexagonGridVisibility();
  }

  private setupHexagonEventHandlers() {
    // Click handler - use fill layer for better click detection
    this.map.on('click', this.hexagonFillLayerId, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const hexagonId = feature.properties?.['id'];
        const hexagon = this.hexagons.find(h => h.id === hexagonId);

        if (hexagon) {
          this.onHexagonClick(hexagon);
        }
      }
    });

    // Hover handlers for fill layer (entire hexagon area)
    this.map.on('mouseenter', this.hexagonFillLayerId, (e) => {
      this.map.getCanvas().style.cursor = 'pointer';

      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const hexagonId = feature.properties?.['id'];
        const hexagon = this.hexagons.find(h => h.id === hexagonId);

        if (hexagon) {
          // Show labels and add hover effect
          this.showHexagonLabel(hexagonId);
          this.addHoverEffect(hexagonId);
          this.onHexagonHover(hexagon);
        }
      }
    });

    this.map.on('mouseleave', this.hexagonFillLayerId, () => {
      this.map.getCanvas().style.cursor = '';
      // Hide labels and remove hover effect
      this.hideHexagonLabels();
      this.removeHoverEffect();
      this.onHexagonHover(null);
    });
  }

  private removeHexagonGridFromMap() {
    // Remove layers in reverse order (including hover effect layer)
    const layers = [this.hexagonLabelLayerId, this.hexagonOutlineLayerId, this.hexagonFillLayerId, 'hexagon-hover-fill'];
    layers.forEach(layerId => {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });

    // Remove source
    if (this.map.getSource(this.hexagonSourceId)) {
      this.map.removeSource(this.hexagonSourceId);
    }
  }

  private toggleHexagonGridVisibility() {
    const visibility = this.showHexagonGrid ? 'visible' : 'none';

    // Toggle all hexagon layers including the invisible fill layer
    const layers = [this.hexagonFillLayerId, this.hexagonOutlineLayerId];
    layers.forEach(layerId => {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });
    // Labels remain hidden unless hovering
  }

  // Hexagon-related methods
  toggleHexagonGrid() {
    this.showHexagonGrid = !this.showHexagonGrid;
    if (this.showHexagonGrid) {
      // Initialize fixed KL hexagon grid
      this.initializeHexagonGrid();
      // Center map on KL
      this.centerMapOnKL();
    } else {
      // Hide and clean up
      this.removeHexagonGridFromMap();
    }
  }

  // Center map on Kuala Lumpur
  private centerMapOnKL() {
    this.map.flyTo({
      center: [this.KL_CENTER.lng, this.KL_CENTER.lat],
      zoom: 12,
      duration: 1500
    });
  }

  onHexagonClick(hexagon: HexagonData) {
    console.log('Hexagon clicked:', hexagon);
    this.selectedHexagon = hexagon.id;
    this.selectedHexagonData = hexagon;

    // If the hexagon is available, open purchase modal
    if (!hexagon.isOwned) {
      this.openPurchaseModal(hexagon);
    } else {
      // If owned, show rental options
      this.openPurchaseModal(hexagon);
    }
  }

  onHexagonHover(hexagon: HexagonData | null) {
    this.hoveredHexagon = hexagon;
  }

  async openPurchaseModal(hexagon?: HexagonData) {
    if (hexagon) {
      this.selectedHexagonData = hexagon;
    } else if (!this.selectedHexagonData) {
      // Show input dialog for hexagon ID
      await this.showHexagonIdInput();
      return;
    }

    const hexagonData = this.selectedHexagonData;
    if (!hexagonData) return;

    if (hexagonData.isOwned) {
      await this.showRentDialog(hexagonData);
    } else {
      await this.showPurchaseDialog(hexagonData);
    }
  }

  private async showHexagonIdInput() {
    const alert = await this.alertController.create({
      header: 'Enter Hexagon ID',
      inputs: [
        {
          name: 'hexagonId',
          type: 'number',
          placeholder: 'Enter hexagon ID (e.g. 12345)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Find',
          handler: (data) => {
            if (data.hexagonId) {
              this.onHexagonSearch(data.hexagonId);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async showPurchaseDialog(hexagon: HexagonData) {
    const alert = await this.alertController.create({
      header: `Purchase Hexagon #${hexagon.id}`,
      message: `
        <div style="text-align: center;">
          <p><strong>Location:</strong> ${hexagon.center[1].toFixed(4)}, ${hexagon.center[0].toFixed(4)}</p>
          <p><strong>Price:</strong> ${hexagon.price || 100} HBAR</p>
          <p><strong>Status:</strong> Available</p>
        </div>
      `,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Purchase',
          handler: () => {
            const purchaseRequest: PurchaseRequest = {
              hexagonId: hexagon.id,
              paymentMethod: 'wallet'
            };
            this.hexagonPurchase.emit(purchaseRequest);
          }
        }
      ]
    });

    await alert.present();
  }

  private async showRentDialog(hexagon: HexagonData) {
    const alert = await this.alertController.create({
      header: `Hexagon #${hexagon.id} - Owned`,
      message: `
        <div style="text-align: center;">
          <p><strong>Location:</strong> ${hexagon.center[1].toFixed(4)}, ${hexagon.center[0].toFixed(4)}</p>
          <p><strong>Status:</strong> Owned${hexagon.owner ? ' by ' + hexagon.owner : ''}</p>
          <p>This hexagon is already owned. You can request to rent device placement rights from the owner.</p>
        </div>
      `,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Request Rental',
          handler: () => {
            this.hexagonRentRequest.emit({
              hexagonId: hexagon.id,
              ownerAddress: hexagon.owner
            });
          }
        }
      ]
    });

    await alert.present();
  }

  // These methods are now handled by the alert dialogs

  onHexagonSearch(hexagonId: string) {
    console.log('Searching for hexagon:', hexagonId);

    const hexagon = this.hexagons.find(h => h.id === hexagonId);
    if (hexagon) {
      this.selectedHexagonData = hexagon;
      this.selectedHexagon = hexagon.id;

      // Center map on the hexagon
      this.map.flyTo({
        center: hexagon.center,
        zoom: 10,
        duration: 1000
      });

      // Highlight the hexagon
      this.selectHexagon(hexagon.id);
    } else {
      console.error('Hexagon not found:', hexagonId);
    }
  }

  // Method to update owned hexagons from external source
  updateOwnedHexagons(ownedIds: string[]) {
    this.ownedHexagons = ownedIds;
    this.updateHexagonStyles();
  }



  // Show hexagon label on hover
  private showHexagonLabel(hexagonId: string) {
    this.map.setLayoutProperty(this.hexagonLabelLayerId, 'visibility', 'visible');

    // Filter to show only the hovered hexagon's label
    this.map.setFilter(this.hexagonLabelLayerId, ['==', ['get', 'id'], hexagonId]);
  }

  // Hide hexagon labels
  private hideHexagonLabels() {
    this.map.setLayoutProperty(this.hexagonLabelLayerId, 'visibility', 'none');
    this.map.setFilter(this.hexagonLabelLayerId, null);
  }

  // Add subtle hover effect with inner shadow
  private addHoverEffect(hexagonId: string) {
    // Add a subtle fill layer for hover effect
    if (!this.map.getLayer('hexagon-hover-fill')) {
      this.map.addLayer({
        id: 'hexagon-hover-fill',
        type: 'fill',
        source: this.hexagonSourceId,
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': 0.02 // Very subtle inner shade
        }
      }, this.hexagonOutlineLayerId);
    }

    // Filter to show only the hovered hexagon
    this.map.setFilter('hexagon-hover-fill', ['==', ['get', 'id'], hexagonId]);
    this.map.setLayoutProperty('hexagon-hover-fill', 'visibility', 'visible');

    // Enhance border opacity slightly on hover
    this.map.setPaintProperty(this.hexagonOutlineLayerId, 'line-opacity', [
      'case',
      ['==', ['get', 'id'], hexagonId],
      0.7, // Higher opacity for hovered hexagon
      0.4  // Normal opacity for others
    ]);
  }

  // Remove hover effect
  private removeHoverEffect() {
    if (this.map.getLayer('hexagon-hover-fill')) {
      this.map.setLayoutProperty('hexagon-hover-fill', 'visibility', 'none');
    }

    // Reset border opacity
    this.map.setPaintProperty(this.hexagonOutlineLayerId, 'line-opacity', 0.4);
  }

  // Public method to select a hexagon
  selectHexagon(hexagonId: string) {
    this.selectedHexagon = hexagonId;
    this.updateHexagonStyles();
  }

  // Update hexagon styles (ownership, selection)
  private updateHexagonStyles() {
    if (!this.map.getSource(this.hexagonSourceId) || !this.hexagonGrid) return;

    // Update hexagon ownership status in both our tracking and the grid data
    this.hexagons.forEach(hexagon => {
      hexagon.isOwned = this.ownedHexagons.includes(hexagon.id);
    });

    // Update the grid features
    this.hexagonGrid.features.forEach((feature: any) => {
      const hexId = feature.properties.id;
      feature.properties.isOwned = this.ownedHexagons.includes(hexId);
      feature.properties.isSelected = hexId === this.selectedHexagon;
    });

    // Update the data source
    (this.map.getSource(this.hexagonSourceId) as mapboxgl.GeoJSONSource).setData(this.hexagonGrid);
  }
}
