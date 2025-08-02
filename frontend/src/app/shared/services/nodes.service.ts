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

export interface GetNodesParams {
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
}
