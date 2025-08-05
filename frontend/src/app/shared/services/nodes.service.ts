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
   * Trigger device control action via WebSocket
   */
  triggerDevice(deviceId: string, action: 'start' | 'stop'): Observable<any> {
    return this.http.post(`${API_BASE_URL}/devices/${deviceId}/trigger`, { action });
  }
}
