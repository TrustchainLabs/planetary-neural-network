import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants';
import { Node, Geometry } from '../types';

export interface RegisterNodeParams {
  name: string;
  uuid: string;
  location: Geometry;
}

export interface CreateDeviceParams {
  name: string;
  hexId: string;
  owner?: string;
}

export interface Device {
  _id: string;
  deviceId: string;
  name: string;
  hexId: string;
  ownerAddress: string;
  hederaAccount?: string;
  hcsTopic?: string;
  privateKey?: string;
  publicKey?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetNodesParams {
  includeLatestMeasurement?: boolean;
}

export interface GetDevicesParams {
  ids?: string[];
  includeLatestMeasurement?: boolean;
}

export interface SensorReading {
  _id: string;
  deviceId: string;
  value: number;
  unit: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface SensorAnalysis {
  _id: string;
  deviceId: string;
  batchId: string;
  readingCount: number;
  timeRange: {
    start: string;
    end: string;
  };
  averageTemperature: number;
  unit: string;
  minimumTemperature: number;
  maximumTemperature: number;
  outliers: any[];
  predictions: Array<{
    predictedValue: number;
    confidence: number;
    anomalyScore: number;
    isAnomaly: boolean;
    trend: string;
  }>;
  severity: string;
  warnings: string[];
  aiInsights: string;
  location: {
    latitude: number;
    longitude: number;
  };
  chainTxHash: string;
  analysisTimestamp: string;
  statisticalData: {
    standardDeviation: number;
    variance: number;
    trendSlope: number;
    stabilityScore: number;
    mlConfidenceScore: number;
    modelTrained: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NodesService {
  constructor(private http: HttpClient) {}

  registerNode(params: RegisterNodeParams): Observable<Node> {
    return this.http.post<Node>(`${API_BASE_URL}/devices`, params);
  }

  getNodes(params: GetNodesParams = {}): Observable<Node[]> {
    return this.http.get<Node[]>(`${API_BASE_URL}/devices`, {
      params: {
        ...(params.includeLatestMeasurement && { includeLatestMeasurement: params.includeLatestMeasurement })
      }
    });
  }

  /**
   * Create a new device with medallion association
   */
  createDevice(params: CreateDeviceParams): Observable<Device> {
    return this.http.post<Device>(`${API_BASE_URL}/devices`, params);
  }

  /**
   * Get all devices with their medallion associations
   */
  getDevices(params: GetDevicesParams = {}): Observable<Device[]> {
    return this.http.get<Device[]>(`${API_BASE_URL}/devices`, {
      params: {
        ...(params.ids && { ids: params.ids.join(',') }),
        ...(params.includeLatestMeasurement && { includeLatestMeasurement: params.includeLatestMeasurement.toString() })
      }
    });
  }

  /**
   * Get a specific device by ID
   */
  getDevice(deviceId: string): Observable<Device> {
    return this.http.get<Device>(`${API_BASE_URL}/devices/${deviceId}`);
  }

  /**
   * Update a device
   */
  updateDevice(deviceId: string, updateData: Partial<Device>): Observable<Device> {
    return this.http.put<Device>(`${API_BASE_URL}/devices/${deviceId}`, updateData);
  }

  /**
   * Delete a device
   */
  deleteDevice(deviceId: string): Observable<Device> {
    return this.http.delete<Device>(`${API_BASE_URL}/devices/${deviceId}`);
  }

  /**
   * Start data collection for a device
   */
  startDataCollection(deviceId: string, privateKey: string): Observable<any> {
    return this.http.post(`${API_BASE_URL}/sensors/data-collection/start`, {
      deviceId,
      privateKey
    });
  }

  /**
   * Stop data collection for a device
   */
  stopDataCollection(deviceId: string, privateKey: string): Observable<any> {
    return this.http.post(`${API_BASE_URL}/sensors/data-collection/stop`, {
      deviceId,
      privateKey
    });
  }

  /**
   * Get data collection status for a device
   */
  getDataCollectionStatus(deviceId: string): Observable<any> {
    return this.http.get(`${API_BASE_URL}/sensors/data-collection/status/${deviceId}`);
  }

  /**
   * Get raw sensor data for a device
   */
  getRawSensorData(deviceId: string): Observable<SensorReading[]> {
    return this.http.get<SensorReading[]>(`${API_BASE_URL}/sensors/data-collection/raw?deviceId=${deviceId}`);
  }

  /**
   * Get sensor analysis for a device
   */
  getSensorAnalysis(deviceId: string): Observable<SensorAnalysis[]> {
    return this.http.get<SensorAnalysis[]>(`${API_BASE_URL}/sensors/data-collection/analysis?deviceId=${deviceId}`);
  }

  /**
   * Get all sensor analysis
   */
  getAllSensorAnalysis(): Observable<SensorAnalysis[]> {
    return this.http.get<SensorAnalysis[]>(`${API_BASE_URL}/sensors/data-collection/all`);
  }

  /**
   * Get wallet balance for reward tokens (placeholder - would need actual endpoint)
   */
  getWalletBalance(walletAddress: string): Observable<{ balance: number, symbol: string }> {
    // This would need to be implemented on the backend
    // For now, return a mock response
    return new Observable(observer => {
      observer.next({ balance: 0, symbol: 'REWARD' });
      observer.complete();
    });
  }
}
