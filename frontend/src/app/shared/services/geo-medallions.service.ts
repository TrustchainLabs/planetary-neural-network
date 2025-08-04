import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface GeoMedallion {
  _id: string;
  hexId: string;
  center: Coordinate;
  vertices: Coordinate[];
  price: number;
  available: boolean;
  ownerAddress?: string;
  nftTokenId?: string;
  hederaTopicId?: string;
  purchaseTransactionId?: string;
  purchasedAt?: string;
  mintTransactionId?: string;
  mintedAt?: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  devices?: Array<{
    deviceId: string;
    name: string;
    ownerAddress: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedallionRequest {
  center: Coordinate;
  price: number;
  available?: boolean;
}

export interface PurchaseMedallionRequest {
  buyerAddress: string;
  paymentTransactionId: string;
}

export interface PurchaseMedallionResponse {
  medallion: GeoMedallion;
  status: string;
  message: string;
  jobId: string;
}

export interface GetMedallionsParams {
  page?: number;
  limit?: number;
  available?: boolean;
  ownerAddress?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface PaginatedMedallionsResponse {
  data: GeoMedallion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeoMedallionsService {
  constructor(private http: HttpClient) {}

  /**
   * Get all medallions with filtering and pagination
   */
  getMedallions(params: GetMedallionsParams = {}): Observable<PaginatedMedallionsResponse> {
    return this.http.get<PaginatedMedallionsResponse>(`${API_BASE_URL}/geo-medallions`, {
      params: {
        ...(params.page && { page: params.page.toString() }),
        ...(params.limit && { limit: params.limit.toString() }),
        ...(params.available !== undefined && { available: params.available.toString() }),
        ...(params.ownerAddress && { ownerAddress: params.ownerAddress }),
        ...(params.priceMin && { priceMin: params.priceMin.toString() }),
        ...(params.priceMax && { priceMax: params.priceMax.toString() })
      }
    });
  }

  /**
   * Get a specific medallion by hex ID
   */
  getMedallion(hexId: string): Observable<GeoMedallion> {
    return this.http.get<GeoMedallion>(`${API_BASE_URL}/geo-medallions/${hexId}`);
  }

  /**
   * Create a new medallion
   */
  createMedallion(medallion: CreateMedallionRequest): Observable<GeoMedallion> {
    return this.http.post<GeoMedallion>(`${API_BASE_URL}/geo-medallions`, medallion);
  }

  /**
   * Purchase a medallion
   */
  purchaseMedallion(hexId: string, purchase: PurchaseMedallionRequest): Observable<PurchaseMedallionResponse> {
    return this.http.post<PurchaseMedallionResponse>(`${API_BASE_URL}/geo-medallions/${hexId}/buy`, purchase);
  }

  /**
   * Get available medallions only
   */
  getAvailableMedallions(): Observable<GeoMedallion[]> {
    return this.http.get<GeoMedallion[]>(`${API_BASE_URL}/geo-medallions/available`);
  }

  /**
   * Get medallions owned by a specific address
   */
  getMedallionsByOwner(ownerAddress: string): Observable<GeoMedallion[]> {
    return this.http.get<GeoMedallion[]>(`${API_BASE_URL}/geo-medallions/owner/${ownerAddress}`);
  }
}
