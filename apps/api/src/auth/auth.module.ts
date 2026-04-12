import { Module } from '@nestjs/common';
import { SupabaseJwtService } from './supabase-jwt.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { EmailVerifiedGuard } from './email-verified.guard';

@Module({
	providers: [SupabaseJwtService, SupabaseAuthGuard, EmailVerifiedGuard],
	exports: [SupabaseJwtService, SupabaseAuthGuard, EmailVerifiedGuard],
})
export class AuthModule {}
