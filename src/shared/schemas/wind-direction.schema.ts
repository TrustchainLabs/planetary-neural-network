import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types, HydratedDocument } from 'mongoose'
import { Unit } from '../../shared/enums'

@Schema({ toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class WindDirection {
    @Prop({ required: true, enum: [Unit.DEGREE] })
    unit: Unit.DEGREE

    @Prop({ required: true })
    value: number
}

export type WindDirectionDocument = HydratedDocument<WindDirection>
export const WindDirectionSchema = SchemaFactory.createForClass(WindDirection)
