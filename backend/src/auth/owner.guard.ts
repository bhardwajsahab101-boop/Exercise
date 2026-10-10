import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OwnerGuard implements CanActivate {
  private readonly logger = new Logger(OwnerGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException('Authentication required to verify owner privileges');
    }

    const rawOwnerId = this.configService.get<string>('OWNER_USER_ID');
    const configuredOwnerId = rawOwnerId && rawOwnerId.trim().length > 0 ? rawOwnerId.trim() : null;
    const rawOwnerEmail = this.configService.get<string>('OWNER_EMAIL');
    const configuredOwnerEmail = rawOwnerEmail && rawOwnerEmail.trim().length > 0 ? rawOwnerEmail.trim() : null;

    // If an owner user ID is specified, verify strict match
    if (configuredOwnerId && user.id !== configuredOwnerId) {
      this.logger.warn(
        `Denied access to user ${user.id} (${user.email || 'no-email'}): Does not match configured OWNER_USER_ID (${configuredOwnerId})`,
      );
      throw new ForbiddenException(
        'Access denied: Only the designated workout owner can modify workouts or manage sharing.',
      );
    }

    // If an owner email is specified, verify strict match
    if (configuredOwnerEmail && user.email && user.email.toLowerCase() !== configuredOwnerEmail.toLowerCase()) {
      this.logger.warn(
        `Denied access to user ${user.email}: Does not match configured OWNER_EMAIL (${configuredOwnerEmail})`,
      );
      throw new ForbiddenException(
        'Access denied: Only the designated workout owner can modify workouts or manage sharing.',
      );
    }

    return true;
  }
}
