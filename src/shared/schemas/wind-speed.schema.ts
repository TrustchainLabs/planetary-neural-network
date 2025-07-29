import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types, HydratedDocument } from 'mongoose'
import { Unit } from '../../shared/enums'

@Schema({ toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class WindSpeed {
    @Prop({ required: true, enum: [Unit.KM_P_H] })
    unit: Unit.KM_P_H

    @Prop({ required: true })
    value: number
}

export type WindSpeedDocument = HydratedDocument<WindSpeed>
export const WindSpeedSchema = SchemaFactory.createForClass(WindSpeed)
