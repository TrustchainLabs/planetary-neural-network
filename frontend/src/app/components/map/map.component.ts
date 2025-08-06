import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, OnChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FeatureCollection, Feature } from '../../shared/types';
import { GeometryType } from '../../shared/enums';
import { MAPBOX_CONFIG, HASHSCAN_URL } from '../../shared/constants';
import { GeoMedallionsService, GeoMedallion, PurchaseMedallionRequest } from '../../shared/services/geo-medallions.service';
import { NodesService, Device } from '../../shared/services/nodes.service';
import { CustomModalService } from '../../services/custom-modal.service';
import { MeasurementsService } from '../../shared/services/measurements.service';
import * as turf from '@turf/turf';

// Hexagon-related interfaces (updated to match backend data)
export interface HexagonData {
  id: string;
  hexId: string;
  center: [number, number]; // [lng, lat]
  vertices: [number, number][]; // Array of [lng, lat] coordinates
  isOwned: boolean;
  owner?: string;
  price?: number;
  available: boolean;
  nftTokenId?: string;
  devices?: Array<{
    deviceId: string;
    name: string;
    ownerAddress: string;
    createdAt: string;
  }>;
  medallion?: GeoMedallion; // Reference to full medallion data
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

      <!-- Loading Indicator -->
      <div class="loading-overlay" *ngIf="isLoading">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading medallions and devices...</p>
      </div>

      <!-- Coordinate Selection Mode Indicator -->
      <div class="coordinate-selection-overlay" *ngIf="coordinateSelectionMode">
        <div class="selection-indicator">
          <ion-icon name="location-outline"></ion-icon>
          <p>Click on the map to select coordinates</p>
        </div>
      </div>
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
  @Input() coordinateSelectionMode: boolean = false; // New input for coordinate selection mode

  @Output() markerSelect = new EventEmitter<Feature | undefined>();
  @Output() hexagonPurchase = new EventEmitter<PurchaseRequest>();
  @Output() hexagonRentRequest = new EventEmitter<{ hexagonId: string; ownerAddress?: string }>();
  @Output() coordinateSelected = new EventEmitter<{ latitude: number; longitude: number }>(); // New output for coordinate selection
  @Output() medallionSelect = new EventEmitter<HexagonData>(); // New output for medallion selection for device addition

  public map!: mapboxgl.Map;
  private markers: mapboxgl.Marker[] = [];
  private deviceMarkers: mapboxgl.Marker[] = [];

  // Hexagon-related properties
  selectedHexagon?: string;
  selectedHexagonData?: HexagonData;
  hoveredHexagon?: HexagonData;
  popupPosition = { x: 0, y: 0 };

  // Data properties
  medallions: GeoMedallion[] = [];
  devices: Device[] = [];
  isLoading = false;

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

  constructor(
    private customModalService: CustomModalService,
    private geoMedallionsService: GeoMedallionsService,
    private nodesService: NodesService,
    private measurementsService: MeasurementsService
  ) {}

  ngOnInit() {
    this.initializeMap();
    this.loadData();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  /**
   * Load medallions and devices from the backend
   */
  private async loadData() {
    this.isLoading = true;
    try {
      // Load medallions and devices in parallel
      const [medallionsResponse, devices] = await Promise.all([
        this.geoMedallionsService.getMedallions({ limit: 1000 }).toPromise(),
        this.nodesService.getDevices({ includeLatestMeasurement: true }).toPromise()
      ]);

      this.medallions = medallionsResponse?.data || [];
      this.devices = devices || [];

      console.log('Loaded medallions:', this.medallions.length);
      console.log('Loaded devices:', this.devices.length);

      // Generate hexagon grid data (this doesn't require the map to be loaded)
      if (this.showHexagonGrid) {
        this.generateHexagonGridFromMedallions();
      }

      // Add device markers to map (only if map is ready)
      if (this.map && this.map.isStyleLoaded()) {
        this.addDeviceMarkers();

        // Add hexagon grid if map is ready
        if (this.showHexagonGrid && this.hexagonGrid) {
          this.addHexagonGridToMap();
          this.setupHexagonEventHandlers();
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Generate hexagon grid from backend medallion data
   */
  private generateHexagonGridFromMedallions() {
    if (!this.medallions?.length) {
      console.warn('No medallions data available');
      return;
    }

    // Create GeoJSON features from medallion data
    const features = this.medallions.map(medallion => {
      // Convert vertices from lat/lng objects to [lng, lat] coordinate arrays
      const coordinates = medallion.vertices.map(vertex => [vertex.longitude, vertex.latitude]);
      // Close the polygon by adding the first point at the end
      coordinates.push(coordinates[0]);

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coordinates]
        },
        properties: {
          id: medallion.hexId,
          hexId: medallion.hexId,
          isOwned: !!medallion.ownerAddress,
          isSelected: false,
          price: medallion.price,
          available: medallion.available,
          ownerAddress: medallion.ownerAddress,
          nftTokenId: medallion.nftTokenId,
          deviceCount: medallion.devices?.length || 0
        }
      };
    });

    this.hexagonGrid = {
      type: 'FeatureCollection' as const,
      features
    };

    // Create hexagon data for internal tracking
    this.hexagons = this.medallions.map(medallion => ({
      id: medallion.hexId,
      hexId: medallion.hexId,
      center: [medallion.center.longitude, medallion.center.latitude], // [lng, lat]
      vertices: medallion.vertices.map(v => [v.longitude, v.latitude] as [number, number]),
      isOwned: !!medallion.ownerAddress,
      owner: medallion.ownerAddress,
      price: medallion.price,
      available: medallion.available,
      nftTokenId: medallion.nftTokenId,
      devices: medallion.devices,
      medallion: medallion
    }));

    console.log(`Generated ${this.hexagons.length} hexagons from medallion data`);
  }

  /**
   * Add device markers to the map
   */
  private addDeviceMarkers() {
    // Remove existing device markers
    this.removeDeviceMarkers();

    if (!this.devices?.length) {
      console.log('No devices to display');
      return;
    }

    this.devices.forEach(device => {
      // Find the medallion for this device to get its location
      const medallion = this.medallions.find(m => m.hexId === device.hexId);
      if (!medallion) {
        console.warn(`No medallion found for device ${device.deviceId} with hexId ${device.hexId}`);
        return;
      }

      // Validate medallion coordinates
      if (!medallion.center ||
          isNaN(medallion.center.latitude) ||
          isNaN(medallion.center.longitude)) {
        console.warn(`Invalid coordinates for medallion ${medallion.hexId}:`, medallion.center);
        return;
      }

      console.log(`Creating device marker for ${device.name} at medallion ${medallion.hexId}:`,
                  medallion.center.latitude, medallion.center.longitude);

      // Create device marker at medallion center (could be offset slightly for multiple devices)
      const marker = this.createDeviceMarker(device, medallion);
      marker.addTo(this.map);
      this.deviceMarkers.push(marker);
    });

    console.log(`Added ${this.deviceMarkers.length} device markers`);
  }

  /**
   * Create a device marker
   */
  private createDeviceMarker(device: Device, medallion: GeoMedallion): mapboxgl.Marker {
    // Create device marker element
    const markerEl = document.createElement('div');
    markerEl.className = 'device-marker';
    markerEl.innerHTML = `
      <div class="device-icon">
        <img src="assets/images/brand-logo.svg" alt="Device" width="24" height="24" />
      </div>
    `;
    markerEl.style.cssText = `
      width: 32px;
      height: 32px;
      background:rgb(12, 213, 19);
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

    markerEl.onclick = async () => {
      console.log('Device clicked:', device);

      // Try to get latest measurement for this device
      let latestMeasurement = null;
      try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const measurements = await this.measurementsService.getMeasurements({
          deviceId: device.deviceId,
          startDate: oneDayAgo.toISOString(),
          endDate: now.toISOString()
        }).toPromise();

        if (measurements && measurements.length > 0) {
          // Get the most recent measurement
          latestMeasurement = measurements[measurements.length - 1];
        }
      } catch (error) {
        console.warn('Could not fetch latest measurement for device:', device.deviceId, error);
      }

      // Format device data as a Feature object that the left panel expects
      const deviceFeature: Feature = {
        type: 'Feature',
        geometry: {
          type: GeometryType.POINT,
          coordinates: [medallion.center.longitude, medallion.center.latitude, 0]
        },
        properties: {
          // Standard Feature properties that the left panel expects
          id: device.deviceId,
          uuid: device.deviceId,
          name: device.name,
          hederaAccount: device.hederaAccount,

          // Device-specific properties
          deviceId: device.deviceId,
          hexId: device.hexId,
          ownerAddress: device.ownerAddress,
          medallion: medallion,

          // Include latest measurement if available
          latestMeasurement: latestMeasurement,

          // Add coordinates for display
          latitude: medallion.center.latitude,
          longitude: medallion.center.longitude
        }
      };

      // Emit device selection event
      this.markerSelect.emit(deviceFeature);
    };

    return new mapboxgl.Marker(markerEl, { offset: [0, -16] })
      .setLngLat([medallion.center.longitude, medallion.center.latitude])
  }

  /**
   * Remove device markers from map
   */
  private removeDeviceMarkers() {
    this.deviceMarkers.forEach(marker => marker.remove());
    this.deviceMarkers = [];
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
    if (this.map && this.markerGeojson && this.markerGeojson.features) {
      // Only add traditional measurement markers if they have valid geometry
      const validFeatures = this.markerGeojson.features.filter(feature =>
        feature.geometry &&
        feature.geometry.coordinates &&
        feature.geometry.coordinates.length >= 2 &&
        !isNaN(feature.geometry.coordinates[0]) &&
        !isNaN(feature.geometry.coordinates[1])
      );

      if (validFeatures.length > 0) {
        this.addMarkers({
          type: 'FeatureCollection',
          features: validFeatures
        });
      }
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

      // Add device markers if data is already loaded
      if (this.devices && this.devices.length > 0 && this.medallions && this.medallions.length > 0) {
        this.addDeviceMarkers();
      }

      // Add hexagon grid if data is already loaded and grid is enabled
      if (this.showHexagonGrid && this.hexagonGrid && this.medallions && this.medallions.length > 0) {
        this.addHexagonGridToMap();
        this.setupHexagonEventHandlers();
      }

      if (this.markerGeojson) {
        // Only add traditional measurement markers if they have valid geometry
        const validFeatures = this.markerGeojson.features.filter(feature =>
          feature.geometry &&
          feature.geometry.coordinates &&
          feature.geometry.coordinates.length >= 2 &&
          !isNaN(feature.geometry.coordinates[0]) &&
          !isNaN(feature.geometry.coordinates[1])
        );

        if (validFeatures.length > 0) {
          this.addMarkers({
            type: 'FeatureCollection',
            features: validFeatures
          });
        }
      }

      // Setup coordinate selection click handler
      this.setupCoordinateSelectionHandler();

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
        hexId: hexId,
        center: [lng, lat],
        vertices: feature.geometry.coordinates[0],
        isOwned: this.ownedHexagons.includes(hexId),
        available: !this.ownedHexagons.includes(hexId),
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

    // Check if map style is loaded
    if (!this.map.isStyleLoaded()) {
      console.warn('Map style not loaded yet, deferring hexagon grid addition');
      // Retry after a short delay
      setTimeout(() => this.addHexagonGridToMap(), 100);
      return;
    }

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

    this.map.on('mousemove', this.hexagonFillLayerId, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const hexagonId = feature.properties?.['id'];
        const hexagon = this.hexagons.find(h => h.id === hexagonId);
        if (hexagon && this.hoveredHexagon?.id !== hexagonId) {
          this.onHexagonHover(hexagon);
          this.showHexagonLabel(hexagonId);
          this.addHoverEffect(hexagonId);
        }
      } else {
        this.onHexagonHover(null);
        this.hideHexagonLabels();
        this.removeHoverEffect();
      }
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

    // Emit medallion selection event to open add device tab with pre-filled medallion
    this.medallionSelect.emit(hexagon);
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

    if (!hexagonData.isOwned) {
      await this.showPurchaseDialog(hexagonData);
    }
  }

  private async showHexagonIdInput() {
    const inputs = [
      {
        name: 'hexagonId',
        type: 'number' as const,
        label: 'Hexagon ID',
        placeholder: 'Enter hexagon ID (e.g. 12345)',
        required: true
      }
    ];

    const data = await this.customModalService.presentInput(
      'Enter Hexagon ID',
      inputs,
      undefined,
      'Find',
      'Cancel'
    );

    if (data && data.hexagonId) {
      this.onHexagonSearch(data.hexagonId);
    }
  }

  private async showPurchaseDialog(hexagon: HexagonData) {
    const message = `
      <div style="text-align: center;">
        <p><strong>Hex ID:</strong> ${hexagon.hexId}</p>
        <p><strong>Location:</strong> ${hexagon.center[1].toFixed(4)}, ${hexagon.center[0].toFixed(4)}</p>
        <p><strong>Price:</strong> ${hexagon.price || 1} HBAR</p>
        <p><strong>Status:</strong> ${hexagon.available ? 'Available' : 'Unavailable'}</p>
        ${hexagon.devices && hexagon.devices.length > 0 ?
          `<p><strong>Devices:</strong> ${hexagon.devices.length} device(s)</p>` :
          '<p><strong>Devices:</strong> None</p>'
        }
      </div>
    `;

    const inputs = [
      {
        name: 'buyerAddress',
        type: 'text' as const,
        label: 'Wallet Address',
        placeholder: 'Your wallet address (0.0.xxxxx)',
        required: true
      },
      {
        name: 'transactionId',
        type: 'text' as const,
        label: 'Transaction ID',
        placeholder: 'Payment transaction ID',
        required: true
      }
    ];

    const data = await this.customModalService.presentInput(
      `Purchase Medallion ${hexagon.hexId}`,
      inputs,
      message,
      'Purchase',
      'Cancel'
    );

    if (data && data.buyerAddress && data.transactionId) {
      try {
        const purchaseRequest: PurchaseMedallionRequest = {
          buyerAddress: data.buyerAddress,
          paymentTransactionId: data.transactionId
        };

        console.log('Purchasing medallion:', hexagon.hexId, purchaseRequest);
        const result = await this.geoMedallionsService.purchaseMedallion(hexagon.hexId, purchaseRequest).toPromise();

        if (result) {
          console.log('Purchase successful:', result);
          await this.showPurchaseSuccessDialog(result);
          // Reload data to reflect the purchase
          this.loadData();
        }
      } catch (error) {
        console.error('Purchase failed:', error);
        await this.showPurchaseErrorDialog(error);
      }
    }
  }

  private async showPurchaseSuccessDialog(result: any) {
    const message = `
      <div style="text-align: center;">
        <p><strong>Status:</strong> ${result.status}</p>
        <p><strong>Message:</strong> ${result.message}</p>
        <p><strong>Job ID:</strong> ${result.jobId}</p>
        <p>Your NFT is being minted. This may take a few minutes to complete.</p>
      </div>
    `;

    await this.customModalService.presentInfo('Purchase Successful!', message, 'OK');
  }

  private async showPurchaseErrorDialog(error: any) {
    const message = `
      <div style="text-align: center;">
        <p><strong>Error:</strong> ${error.error?.message || error.message || 'Unknown error'}</p>
        <p>Please check your transaction ID and try again.</p>
      </div>
    `;

    await this.customModalService.presentInfo('Purchase Failed', message, 'OK');
  }


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

  /**
   * Setup coordinate selection click handler
   */
  private setupCoordinateSelectionHandler() {
    this.map.on('click', (e) => {
      if (this.coordinateSelectionMode) {
        const { lng, lat } = e.lngLat;
        this.onCoordinateSelect(lat, lng);
      }
    });
  }

  /**
   * Handle coordinate selection
   */
  private onCoordinateSelect(latitude: number, longitude: number) {
    console.log('Coordinate selected:', latitude, longitude);
    this.coordinateSelected.emit({ latitude, longitude });
  }

  /**
   * Exit coordinate selection mode
   */
  exitCoordinateSelectionMode() {
    this.coordinateSelected.emit({ latitude: 0, longitude: 0 }); // Signal to exit mode
  }
}
