import {
  ArrayNotEmpty,
  ArrayUnique,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class ResequenceStopsDto {
  // The stops not yet arrived at, in their new order. A stop's id is its outlet's id.
  @ArrayNotEmpty({ message: 'stopIds must list the stops to reorder' })
  @ArrayUnique({ message: 'stopIds must not repeat a stop' })
  @IsInt({ each: true, message: 'each stop id must be an integer' })
  stopIds: number[];

  // Shown to the driver with the change.
  @IsNotEmpty({ message: 'reason is required' })
  @IsString({ message: 'reason must be a string' })
  @MaxLength(300, { message: 'reason must be at most 300 characters' })
  reason: string;
}
