import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { BatchSyncDto } from './dto/batch-sync.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser, UserPayload } from '../auth/user.decorator';

@ApiTags('workouts')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get()
  @ApiOperation({ summary: "Get all workouts for the authenticated user" })
  @ApiResponse({ status: 200, description: "List of workouts" })
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('type') type?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('query') query?: string,
  ) {
    return this.workoutsService.findAll(user, {
      type,
      start_date: startDate,
      end_date: endDate,
      query,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: "Get workout statistics summary" })
  getSummary(@CurrentUser() user: UserPayload) {
    return this.workoutsService.getSummary(user);
  }

  @Get(':id')
  @ApiOperation({ summary: "Get workout by ID" })
  findOne(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.workoutsService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new workout" })
  @ApiResponse({ status: 211, description: "Workout created successfully" })
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateWorkoutDto) {
    return this.workoutsService.create(user, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: "Update an existing workout" })
  update(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutDto,
  ) {
    return this.workoutsService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a workout" })
  remove(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.workoutsService.remove(user, id);
  }

  @Post('sync')
  @ApiOperation({ summary: "Batch sync offline workouts" })
  syncBatch(@CurrentUser() user: UserPayload, @Body() dto: BatchSyncDto) {
    return this.workoutsService.syncBatch(user, dto.workouts);
  }
}
