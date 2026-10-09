import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ShareService } from './share.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { CurrentUser, UserPayload } from '../auth/user.decorator';

@ApiTags('share')
@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  /**
   * Protected Owner Endpoint: Get current share link status
   */
  @Get('status')
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard, OwnerGuard)
  @ApiOperation({ summary: 'Get current sharing status for the owner' })
  @ApiResponse({ status: 200, description: 'Sharing status' })
  getShareStatus(@CurrentUser() user: UserPayload) {
    return this.shareService.getShareStatus(user.id);
  }

  /**
   * Protected Owner Endpoint: Generate or regenerate a secure share link
   */
  @Post('generate')
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard, OwnerGuard)
  @ApiOperation({ summary: 'Generate a new secure random share link for family viewing' })
  @ApiResponse({ status: 201, description: 'Generated share link details' })
  generateShareLink(@CurrentUser() user: UserPayload) {
    return this.shareService.generateShareToken(user.id);
  }

  /**
   * Protected Owner Endpoint: Revoke the active share link
   */
  @Post('revoke')
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard, OwnerGuard)
  @ApiOperation({ summary: 'Revoke the active share link immediately' })
  @ApiResponse({ status: 200, description: 'Share link revoked successfully' })
  revokeShareLink(@CurrentUser() user: UserPayload) {
    return this.shareService.revokeShareToken(user.id);
  }

  /**
   * Public Read-Only Endpoint: View shared progress via secret random token
   * Validates token hash and returns sanitized progress analytics with no private data.
   */
  @Get(':token')
  @ApiOperation({ summary: 'Read-only family progress view by share token' })
  @ApiResponse({ status: 200, description: 'Sanitized running history and progress' })
  @ApiResponse({ status: 404, description: 'Invalid or revoked share token' })
  getSharedProgress(@Param('token') token: string) {
    return this.shareService.getSharedProgress(token);
  }
}
