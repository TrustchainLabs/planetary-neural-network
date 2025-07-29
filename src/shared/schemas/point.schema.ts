import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types, HydratedDocument } from 'mongoose'
import { GeometryType } from '../../shared/enums'

@Schema({ toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Point {
    @Prop({ required: true, enum: [GeometryType.POINT] })
    type: GeometryType.POINT

    @Prop({ type: [Number], required: true })
    coordinates: [number, number, number]
}

export type PointDocument = HydratedDocument<Point>
export const PointSchema = SchemaFactory.createForClass(Point)
