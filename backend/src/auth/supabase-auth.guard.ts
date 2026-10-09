import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Default guest user ID for offline / demo mode
    const defaultGuestUser = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'guest@stride.local',
    };

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      request.user = defaultGuestUser;
      return true; // Allow guest access with default guest user context
    }

    const token = authHeader.split(' ')[1];
    const userPayload = await this.supabaseService.verifyToken(token);

    if (userPayload) {
      request.user = userPayload;
    } else {
      // If token verification fails, fallback to guest mode or reject depending on strictness
      this.logger.warn('Provided Bearer token invalid or expired. Falling back to guest identity.');
      request.user = defaultGuestUser;
    }

    return true;
  }
}
