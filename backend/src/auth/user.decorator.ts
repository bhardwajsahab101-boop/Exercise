import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserPayload {
  id: string;
  email?: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user || { id: '00000000-0000-0000-0000-000000000000', email: 'guest@stride.local' };
  },
);

export const UserToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.token;
  },
);
