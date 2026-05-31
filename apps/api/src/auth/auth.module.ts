import { Module } from '@nestjs/common';
import { SupabaseJwtService } from './supabase-jwt.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { EmailVerifiedGuard } from './email-verified.guard';
import { AdminAccessService } from './admin-access.service';
import { AdminGuard } from './admin.guard';

@Module({
  providers: [SupabaseJwtService, SupabaseAuthGuard, EmailVerifiedGuard, AdminAccessService, AdminGuard],
  exports: [SupabaseJwtService, SupabaseAuthGuard, EmailVerifiedGuard, AdminAccessService, AdminGuard],
})
export class AuthModule {}
