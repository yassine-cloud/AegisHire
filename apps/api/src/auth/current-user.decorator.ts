import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { SupabaseJwtPayload } from './supabase-jwt.service';

type RequestWithUser = Request & {
  user?: SupabaseJwtPayload;
};

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): SupabaseJwtPayload => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Missing authenticated user context');
    }

    return user;
  },
);
