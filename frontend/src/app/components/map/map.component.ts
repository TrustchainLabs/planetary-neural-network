import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureCollection, Feature } from '../../shared/types';
import { MAPBOX_CONFIG, HASHSCAN_URL } from '../../shared/constants';
import * as mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #mapContainer id="map" class="container"></div>
  `,
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @Input() markerGeojson?: FeatureCollection;
  @Output() markerSelect = new EventEmitter<Feature | undefined>();

  private map!: mapboxgl.Map;
  private markers: mapboxgl.Marker[] = [];

  ngOnInit() {
    this.initializeMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
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

    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: MAPBOX_CONFIG.STYLE,
      center: MAPBOX_CONFIG.CENTER,
      zoom: MAPBOX_CONFIG.ZOOM
    });

    this.map.on('load', () => {
      if (this.markerGeojson) {
        this.addMarkers(this.markerGeojson);
      }
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
}
