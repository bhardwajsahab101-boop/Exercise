import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateWorkoutDto } from './create-workout.dto';

export class BatchSyncDto {
  @ApiProperty({ type: [CreateWorkoutDto], description: 'List of offline workouts to sync' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutDto)
  workouts: CreateWorkoutDto[];
}
