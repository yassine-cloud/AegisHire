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
  private readonly supabaseUrl: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required for Supabase JWT verification');
    }

    this.supabaseUrl = supabaseUrl.replace(/\/+$/, '');
    this.issuer = process.env.SUPABASE_JWT_ISSUER?.trim() || `${this.supabaseUrl}/auth/v1`;
    this.audience = process.env.SUPABASE_JWT_AUDIENCE?.trim() || 'authenticated';

    const jwksUrl = process.env.SUPABASE_JWKS_URL?.trim() || `${this.supabaseUrl}/auth/v1/.well-known/jwks.json`;
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  async verifyAccessToken(token: string): Promise<SupabaseJwtPayload> {
    const verifyOptions: JWTVerifyOptions = {
      issuer: this.issuer,
      audience: this.audience,
    };

    try {
      const { payload } = await jwtVerify(token, this.jwks, verifyOptions);
      return payload as SupabaseJwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired Bearer token');
    }
  }
}
