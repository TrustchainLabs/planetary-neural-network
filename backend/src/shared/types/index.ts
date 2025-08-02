import { GeometryType, Unit } from '../enums'

export type PointGeometry = {
    type: GeometryType.POINT,
    coordinates: [number, number, number]
}

export type Temperature = {
    unit: Unit.CELCIUS,
    value: number
}

export type WindDirection = {
    unit: Unit.DEGREE,
    value: number
}

export type WindSpeed = {
    unit: Unit.KM_P_H,
    value: number
}

export type AtmPressure = {
    unit: Unit.ATM,
    value: number
}

export type AirQuality = {
    unit: Unit.AQI,
    value: number
}
