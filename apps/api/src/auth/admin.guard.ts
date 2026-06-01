import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AdminAccessService } from './admin-access.service';
import type { SupabaseJwtPayload } from './supabase-jwt.service';
import { AccountType } from '@aegishire/db';

type RequestWithUser = Request & {
  user?: SupabaseJwtPayload;
};

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminAccessService: AdminAccessService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Missing authenticated user context');
    }

    if (user.accountType !== AccountType.admin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}