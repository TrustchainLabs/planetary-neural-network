import { registerDecorator, ValidationOptions } from 'class-validator'
import { PointGeometry } from '../types'
import { GeometryType } from '../enums'

export const IsPointGeometry = (validationOptions?: ValidationOptions) => {
    return (object: Object, propertyName: string) => {
        registerDecorator({
            name: 'isPointGeometry',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate (value: PointGeometry) {
                    return isPointGeometry(value)
                },
                defaultMessage () {
                    return `${propertyName} must be a valid Point Geometry`
                }
            }
        })
    }
}

export const isPointGeometry = (pointGeometry: PointGeometry) => {
    return !(
        !pointGeometry || typeof pointGeometry !== 'object' ||
        pointGeometry.type !== GeometryType.POINT ||
        pointGeometry.coordinates?.length !== 3
    )
}

export const areSamePointGeometries = (pointGeometry1: PointGeometry, pointGeometry2: PointGeometry) => {
    if (!isPointGeometry(pointGeometry1) || !isPointGeometry(pointGeometry2)) {
        return false
    }
    return !(
        pointGeometry1.type !== pointGeometry2.type ||
        pointGeometry1.coordinates[0] !== pointGeometry2.coordinates[0] ||
        pointGeometry1.coordinates[1] !== pointGeometry2.coordinates[1] ||
        pointGeometry1.coordinates[2] !== pointGeometry2.coordinates[2]
    )
}
