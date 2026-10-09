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

    const configuredOwnerId = this.configService.get<string>('OWNER_USER_ID');
    const configuredOwnerEmail = this.configService.get<string>('OWNER_EMAIL');

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
