import { Module } from '@nestjs/common';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './workouts.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { OwnerGuard } from '../auth/owner.guard';

@Module({
  controllers: [WorkoutsController],
  providers: [WorkoutsService, SupabaseAuthGuard, OwnerGuard],
  exports: [WorkoutsService],
})
export class WorkoutsModule {}

