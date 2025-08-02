import { Node, FeatureCollection, Feature, GeometryType, MeasurementValue } from '../types';

export const convertToPointGeoJson = (nodes: Node[]): FeatureCollection => {
  const features: Feature[] = nodes.map(node => ({
    type: 'Feature',
    properties: {
      id: node.id,
      name: node.name,
      latestMeasurement: node.latestMeasurement
    },
    geometry: {
      type: GeometryType.POINT,
      coordinates: [node.longitude, node.latitude, node.altitude]
    }
  }));

  return {
    type: 'FeatureCollection',
    features
  };
};

export const formatTemperature = (temp: number | MeasurementValue): string => {
  if (typeof temp === 'object') {
    return `${temp.value.toFixed(1)}${temp.unit}`;
  }
  return `${temp.toFixed(1)}°C`;
};

export const formatPressure = (pressure: number | MeasurementValue): string => {
  if (typeof pressure === 'object') {
    return `${pressure.value.toFixed(1)} ${pressure.unit}`;
  }
  return `${pressure.toFixed(1)} hPa`;
};

export const formatWindSpeed = (speed: number | MeasurementValue): string => {
  if (typeof speed === 'object') {
    return `${speed.value.toFixed(1)} ${speed.unit}`;
  }
  return `${speed.toFixed(1)} m/s`;
};

export const formatWindDirection = (direction: number | MeasurementValue): string => {
  const dirValue = typeof direction === 'object' ? direction.value : direction;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(dirValue / 45) % 8;
  const unit = typeof direction === 'object' ? direction.unit : '°';
  return `${directions[index]} (${dirValue.toFixed(0)}${unit})`;
};

export const formatAirQuality = (quality: number | MeasurementValue): string => {
  const qualityValue = typeof quality === 'object' ? quality.value : quality;
  if (qualityValue <= 50) return `Good (${qualityValue})`;
  if (qualityValue <= 100) return `Moderate (${qualityValue})`;
  if (qualityValue <= 150) return `Unhealthy for Sensitive Groups (${qualityValue})`;
  if (qualityValue <= 200) return `Unhealthy (${qualityValue})`;
  if (qualityValue <= 300) return `Very Unhealthy (${qualityValue})`;
  return `Hazardous (${qualityValue})`;
};
