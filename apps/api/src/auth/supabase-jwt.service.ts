import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyOptions } from 'jose';

export type SupabaseJwtPayload = JWTPayload & {
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: {
    email_verified?: boolean;
  };
};

@Injectable()
export class SupabaseJwtService {
  private supabaseUrl?: string;
  private issuer?: string;
  private audience?: string;
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    this.supabaseUrl = supabaseUrl ? supabaseUrl.replace(/\/+$/, '') : undefined;
    this.issuer = this.supabaseUrl
      ? process.env.SUPABASE_JWT_ISSUER?.trim() || `${this.supabaseUrl}/auth/v1`
      : undefined;
    this.audience = process.env.SUPABASE_JWT_AUDIENCE?.trim() || 'authenticated';
  }

  private getVerificationConfig(): {
    issuer: string;
    audience: string;
    jwks: ReturnType<typeof createRemoteJWKSet>;
  } {
    if (!this.supabaseUrl) {
      throw new Error('SUPABASE_URL is required for Supabase JWT verification');
    }

    if (!this.issuer) {
      this.issuer = process.env.SUPABASE_JWT_ISSUER?.trim() || `${this.supabaseUrl}/auth/v1`;
    }

    if (!this.audience) {
      this.audience = process.env.SUPABASE_JWT_AUDIENCE?.trim() || 'authenticated';
    }

    if (!this.jwks) {
      const jwksUrl =
        process.env.SUPABASE_JWKS_URL?.trim() || `${this.supabaseUrl}/auth/v1/.well-known/jwks.json`;
      this.jwks = createRemoteJWKSet(new URL(jwksUrl));
    }

    return {
      issuer: this.issuer,
      audience: this.audience,
      jwks: this.jwks,
    };
  }

  async verifyAccessToken(token: string): Promise<SupabaseJwtPayload> {
    const { issuer, audience, jwks } = this.getVerificationConfig();
    const verifyOptions: JWTVerifyOptions = {
      issuer,
      audience,
    };

    try {
      const { payload } = await jwtVerify(token, jwks, verifyOptions);
      return payload as SupabaseJwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired Bearer token');
    }
  }
}
