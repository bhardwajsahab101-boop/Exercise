import { Module } from '@nestjs/common';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { OwnerGuard } from '../auth/owner.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [ShareController],
  providers: [ShareService, OwnerGuard, SupabaseAuthGuard],
  exports: [ShareService],
})
export class ShareModule {}
