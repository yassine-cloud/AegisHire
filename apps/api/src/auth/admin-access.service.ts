import { Injectable } from '@nestjs/common';
import type { SupabaseJwtPayload } from './supabase-jwt.service';
import { AccountType } from '@aegishire/db';

@Injectable()
export class AdminAccessService {

  isAdmin(user?: Pick<SupabaseJwtPayload, 'accountType'> | null): boolean {
    if (!user?.accountType) {
      return false;
    }

    return user.accountType === AccountType.admin;
  }
}