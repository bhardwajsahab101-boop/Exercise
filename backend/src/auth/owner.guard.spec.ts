import { describe, it, expect } from 'vitest';
import { OwnerGuard } from './owner.guard.js';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('OwnerGuard', () => {
  it('should throw UnauthorizedException if user is not present on request', () => {
    const configService: any = {
      get: (key: string) => (key === 'OWNER_USER_ID' ? 'owner-uuid' : null),
    };
    const guard = new OwnerGuard(configService);

    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    };

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException if user ID does not match OWNER_USER_ID', () => {
    const configService: any = {
      get: (key: string) => (key === 'OWNER_USER_ID' ? 'owner-uuid' : null),
    };
    const guard = new OwnerGuard(configService);

    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'attacker-uuid', email: 'attacker@evil.com' },
        }),
      }),
    };

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should allow access if user ID matches configured OWNER_USER_ID', () => {
    const configService: any = {
      get: (key: string) => (key === 'OWNER_USER_ID' ? 'owner-uuid' : null),
    };
    const guard = new OwnerGuard(configService);

    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'owner-uuid', email: 'owner@stride.com' },
        }),
      }),
    };

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
