import { GeometryType, UserType } from '../enums';

export type Coordinates = [number, number, number];

export type Geometry = {
  type: GeometryType.POINT;
  coordinates: Coordinates;
};

export type Feature = {
  type: 'Feature';
  properties: { [key: string]: any };
  geometry: Geometry;
};

export type FeatureCollection = {
  type: 'FeatureCollection';
  features: Feature[];
};

export interface Node {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  latestMeasurement?: Measurement;
}

export interface MeasurementValue {
  value: number;
  unit: string;
}

export interface Measurement {
  id: string;
  nodeId: string;
  temperature?: number | MeasurementValue;
  atmPressure?: number | MeasurementValue;
  windSpeed?: number | MeasurementValue;
  windDirection?: number | MeasurementValue;
  airQuality?: number | MeasurementValue;
  timestamp: string;
  createdAt?: string;
}

export interface User {
  id: string;
  email: string;
  type: UserType;
}

// Re-export enums for convenience
export { GeometryType, UserType } from '../enums';
