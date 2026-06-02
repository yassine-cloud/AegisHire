import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyOptions,
} from 'jose';
import { prisma, AccountType } from '@aegishire/db';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SupabaseJwtPayload = JWTPayload & {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: {
    email_verified?: boolean;
  };
  accountType: AccountType;
};

@Injectable()
export class SupabaseJwtService {
  private readonly jwtSecret?: string;
  private readonly supabaseUrl?: string;
  private issuer?: string;
  private audience?: string;
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor() {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET?.trim();
    this.jwtSecret = jwtSecret && jwtSecret.length > 0 ? jwtSecret : undefined;
    const supabaseUrl = process.env.SUPABASE_URL?.trim()?.replace(/\/+$/, '');
    this.supabaseUrl = supabaseUrl;
    this.issuer =
      process.env.SUPABASE_JWT_ISSUER?.trim() ||
      (supabaseUrl ? `${supabaseUrl}/auth/v1` : undefined);
    this.audience =
      process.env.SUPABASE_JWT_AUDIENCE?.trim() || 'authenticated';
  }

  private getVerificationConfig(): {
    audience: string;
    issuer?: string;
  } {
    if (!this.audience) {
      this.audience =
        process.env.SUPABASE_JWT_AUDIENCE?.trim() || 'authenticated';
    }

    return {
      issuer: this.issuer,
      audience: this.audience,
    };
  }

  private getSecretKey(): Uint8Array {
    if (!this.jwtSecret) {
      throw new UnauthorizedException('SUPABASE_JWT_SECRET is not configured');
    }

    return new TextEncoder().encode(this.jwtSecret);
  }

  private getJwks() {
    if (!this.supabaseUrl) {
      throw new UnauthorizedException('SUPABASE_URL is not configured');
    }

    if (!this.jwks) {
      const jwksUrl =
        process.env.SUPABASE_JWKS_URL?.trim() ||
        `${this.supabaseUrl}/auth/v1/.well-known/jwks.json`;
      this.jwks = createRemoteJWKSet(new URL(jwksUrl));
    }

    return this.jwks;
  }

  async verifyAccessToken(token: string): Promise<SupabaseJwtPayload> {
    const { issuer, audience } = this.getVerificationConfig();
    const verifyOptions: JWTVerifyOptions = {
      audience,
    };
    if (issuer) {
      verifyOptions.issuer = issuer;
    }

    let payload: JWTPayload | null = null;

    if (this.jwtSecret) {
      try {
        const result = await jwtVerify(
          token,
          this.getSecretKey(),
          verifyOptions,
        );
        payload = result.payload;
      } catch {
        payload = null;
      }
    }

    if (!payload && this.supabaseUrl) {
      try {
        const result = await jwtVerify(token, this.getJwks(), verifyOptions);
        payload = result.payload;
      } catch {
        payload = null;
      }
    }

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired Bearer token');
    }

    const subject = payload.sub;

    if (typeof subject !== 'string' || subject.length === 0) {
      throw new UnauthorizedException('Token subject is missing');
    }

    if (!UUID_PATTERN.test(subject)) {
      throw new UnauthorizedException('Token subject must be a valid user ID');
    }

    // get the rest of the user info from the profile table
    const profile = await prisma.profile.findUnique({
      where: { userId: subject },
    });

    return {
      ...(payload as Omit<SupabaseJwtPayload, 'id'>),
      id: subject,
      accountType: profile?.accountType || AccountType.developer,
    };
  }
}
