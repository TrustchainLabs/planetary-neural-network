import { IsOptional, IsArray, ArrayNotEmpty, IsBooleanString } from 'class-validator'
import { Types } from 'mongoose'

export class ReadDevicesDto {
    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    ids?: (Types.ObjectId | string)[]

    @IsOptional()
    @IsBooleanString()
    includeLatestMeasurement?: boolean
}
