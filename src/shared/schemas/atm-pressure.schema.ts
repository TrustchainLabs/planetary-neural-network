import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types, HydratedDocument } from 'mongoose'
import { Unit } from '../../shared/enums'

@Schema({ toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class AtmPressure {
    @Prop({ required: true, enum: [Unit.ATM] })
    unit: Unit.ATM

    @Prop({ required: true })
    value: number
}

export type AtmPressureDocument = HydratedDocument<AtmPressure>
export const AtmPressureSchema = SchemaFactory.createForClass(AtmPressure)
