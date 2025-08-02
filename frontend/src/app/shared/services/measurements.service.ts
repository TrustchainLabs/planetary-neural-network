import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SMART_APP_API_URL } from '../constants';
import { Measurement } from '../types';

export interface GetMeasurementsParams {
  nodeId?: string;
  startDate: string;
  endDate: string;
  deviceId?: string;
  groupBy?: string;
  measurementType?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MeasurementsService {
  constructor(private http: HttpClient) {}

  getMeasurements(params: GetMeasurementsParams): Observable<Measurement[]> {
    return this.http.get<Measurement[]>(`${SMART_APP_API_URL}/hcs/messages`, {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        ...(params.deviceId && { deviceId: params.deviceId }),
        ...(params.nodeId && { deviceId: params.nodeId }),
        ...(params.groupBy && { groupBy: params.groupBy }),
        ...(params.measurementType && { measurementType: params.measurementType })
      }
    });
  }
}
