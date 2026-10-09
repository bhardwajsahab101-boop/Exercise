import {
  IsEnum,
  IsDateString,
  IsOptional,
  IsNumber,
  Min,
  IsString,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExerciseTypeEnum {
  RUN = 'run',
  PUSHUPS = 'pushups',
  SITUPS = 'situps',
  SQUATS = 'squats',
}

export class CreateWorkoutDto {
  @ApiProperty({ enum: ExerciseTypeEnum, description: 'Type of exercise' })
  @IsEnum(ExerciseTypeEnum)
  type: ExerciseTypeEnum;

  @ApiProperty({ example: '2026-10-09', description: 'Date of workout (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 5.2, description: 'Distance in kilometers (for runs)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distance_km?: number;

  @ApiPropertyOptional({ example: 4, description: 'Number of sets (for bodyweight exercises)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sets?: number;

  @ApiPropertyOptional({ example: 25, description: 'Reps per set' })
  @IsOptional()
  @IsInt()
  @Min(1)
  reps_per_set?: number;

  @ApiPropertyOptional({ example: 100, description: 'Total reps (computed or specified)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  total_reps?: number;

  @ApiPropertyOptional({ example: 25, description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration_minutes?: number;

  @ApiPropertyOptional({ example: 'Great workout!', description: 'Optional workout note' })
  @IsOptional()
  @IsString()
  notes?: string;
}
