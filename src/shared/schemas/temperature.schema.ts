import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types, HydratedDocument } from 'mongoose'
import { Unit } from '../../shared/enums'

@Schema({ toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Temperature {
    @Prop({ required: true, enum: [Unit.CELCIUS] })
    unit: Unit.CELCIUS

    @Prop({ required: true })
    value: number
}

export type TemperatureDocument = HydratedDocument<Temperature>
export const TemperatureSchema = SchemaFactory.createForClass(Temperature)
