import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LicorDevice {
  _id: string;
  deviceId: string;
  name: string;
  owner: string;
  deviceType: string;
  totalShares: number;
  soldShares: number;
  availableShares: number;
  pricePerShare: number;
  hexId: string;
  locationType: string;
  coordinates: [number, number]; // [longitude, latitude]
  status: string;
  licorConfig?: {
    apiDeviceId: string;
    capabilities: string[];
    pollingInterval: number;
    lastSyncAt: Date;
  };
  metadata?: {
    description: string;
    instrumentModel: string;
    installationDate: Date;
    calibrationDate: Date;
    imageUrl?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DevicePartnership {
  _id: string;
  deviceId: string;
  partnerAddress: string;
  shares: number;
  purchasePriceHbar: number;
  purchaseDate: Date;
  status: string;
  totalCreditsEarned?: number;
  lastCreditDistributionDate?: Date;
}

export interface PartnershipWithDevice {
  partnership: DevicePartnership;
  device: LicorDevice;
  sharePercentage: number;
  rewardsEarned: {
    totalCredits: number;
    lastDistribution: Date | null;
  };
}

export interface UserPortfolioStats {
  totalPartnerships: number;
  totalInvestment: number;
  totalShares: number;
  totalCreditsEarned: number;
  averageSharePercentage: number;
}

export interface DeviceRevenue {
  deviceId: string;
  totalRevenue: number;
  totalPartners: number;
  totalSharesSold: number;
  revenuePerShare: number;
}

export interface PurchaseDeviceShareDto {
  deviceId: string;
  numberOfShares: number;
  buyerWallet: string;
  paymentTransactionId: string;
}

export interface AvailableDevicesQuery {
  search?: string;
  minSharesAvailable?: number;
  maxPricePerShare?: number;
  deviceType?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DevicePartnershipService {
  private readonly apiUrl = `${environment.apiUrl}/devices/partnerships`;

  constructor(private http: HttpClient) {}

  /**
   * Get all available Licor devices for partnership
   */
  getAvailableDevices(query?: AvailableDevicesQuery): Observable<LicorDevice[]> {
    let params = new HttpParams();
    
    if (query) {
      if (query.search) params = params.set('search', query.search);
      if (query.minSharesAvailable !== undefined) 
        params = params.set('minSharesAvailable', query.minSharesAvailable.toString());
      if (query.maxPricePerShare !== undefined) 
        params = params.set('maxPricePerShare', query.maxPricePerShare.toString());
      if (query.deviceType) params = params.set('deviceType', query.deviceType);
      if (query.latitude !== undefined) params = params.set('latitude', query.latitude.toString());
      if (query.longitude !== undefined) params = params.set('longitude', query.longitude.toString());
      if (query.radiusKm !== undefined) params = params.set('radiusKm', query.radiusKm.toString());
    }

    return this.http.get<LicorDevice[]>(`${this.apiUrl}/available`, { params });
  }

  /**
   * Get device details by deviceId
   */
  getDeviceDetails(deviceId: string): Observable<LicorDevice> {
    return this.http.get<LicorDevice>(`${this.apiUrl}/device/${deviceId}`);
  }

  /**
   * Purchase shares in a device
   */
  purchaseShares(dto: PurchaseDeviceShareDto): Observable<DevicePartnership> {
    return this.http.post<DevicePartnership>(`${this.apiUrl}/purchase`, dto);
  }

  /**
   * Get user's partnerships
   */
  getUserPartnerships(wallet: string): Observable<PartnershipWithDevice[]> {
    return this.http.get<PartnershipWithDevice[]>(`${this.apiUrl}/user/${wallet}`);
  }

  /**
   * Get user's portfolio statistics
   */
  getUserStats(wallet: string): Observable<UserPortfolioStats> {
    return this.http.get<UserPortfolioStats>(`${this.apiUrl}/user/${wallet}/stats`);
  }

  /**
   * Get partners of a specific device
   */
  getDevicePartners(deviceId: string): Observable<DevicePartnership[]> {
    return this.http.get<DevicePartnership[]>(`${this.apiUrl}/device/${deviceId}/partners`);
  }

  /**
   * Get revenue details of a device
   */
  getDeviceRevenue(deviceId: string): Observable<DeviceRevenue> {
    return this.http.get<DeviceRevenue>(`${this.apiUrl}/device/${deviceId}/revenue`);
  }

  /**
   * Calculate share percentage from share count
   */
  calculateSharePercentage(shares: number, totalShares: number): number {
    if (totalShares === 0) return 0;
    return Number(((shares / totalShares) * 100).toFixed(2));
  }

  /**
   * Calculate total price for shares
   */
  calculateTotalPrice(shares: number, pricePerShare: number): number {
    return Number((shares * pricePerShare).toFixed(2));
  }

  /**
   * Format device type for display
   */
  formatDeviceType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'LICOR_EDDY_COVARIANCE': 'Eddy Covariance System',
      'LICOR_SOIL_FLUX': 'Soil Flux System',
      'LICOR_SMART_FLUX': 'Smart Flux System',
      'LICOR_TRACE_GAS': 'Trace Gas Analyzer',
      'RASPBERRY_PI_DHT11': 'DHT11 Sensor'
    };
    return typeMap[type] || type;
  }

  /**
   * Get availability status color
   */
  getAvailabilityColor(device: LicorDevice): string {
    const pctAvailable = (device.availableShares / device.totalShares) * 100;
    if (pctAvailable >= 50) return 'success'; // Green
    if (pctAvailable >= 10) return 'warning'; // Yellow
    if (pctAvailable > 0) return 'danger'; // Red
    return 'medium'; // Gray (fully subscribed)
  }

  /**
   * Get availability status label
   */
  getAvailabilityLabel(device: LicorDevice): string {
    const pctAvailable = (device.availableShares / device.totalShares) * 100;
    if (pctAvailable >= 75) return 'High Availability';
    if (pctAvailable >= 50) return 'Good Availability';
    if (pctAvailable >= 25) return 'Limited Availability';
    if (pctAvailable >= 10) return 'Low Availability';
    if (pctAvailable > 0) return 'Almost Sold Out';
    return 'Fully Subscribed';
  }
}

