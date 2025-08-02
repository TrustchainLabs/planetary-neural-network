import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types, HydratedDocument } from 'mongoose'
import { Unit } from '../enums'

@Schema({ toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class AirQuality {
    @Prop({ required: true, enum: [Unit.AQI] })
    unit: Unit.AQI

    @Prop({ required: true })
    value: number
}

export type AirQualityDocument = HydratedDocument<AirQuality>
export const AirQualitySchema = SchemaFactory.createForClass(AirQuality)
