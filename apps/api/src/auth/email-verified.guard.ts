import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { SupabaseJwtPayload } from './supabase-jwt.service';

type RequestWithUser = Request & {
  user?: SupabaseJwtPayload;
};

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Missing authenticated user context');
    }

    const emailVerifiedByMetadata = user.user_metadata?.email_verified === true;
    const emailVerifiedByClaims = Boolean(user.email_confirmed_at || user.confirmed_at);

    if (!emailVerifiedByMetadata && !emailVerifiedByClaims) {
      throw new ForbiddenException('Email verification is required');
    }

    return true;
  }
}
