import { randomBytes } from 'crypto';
import { ForbiddenException, Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { AccountType, prisma, Prisma } from '@aegishire/db';
import type { Profile, Company } from '@aegishire/db';
import type { SupabaseJwtPayload } from '../auth/supabase-jwt.service';
import { AdminAccessService } from '../auth/admin-access.service';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';

type AdminAccountRecord = Profile & { company?: Company | null };
type CreatedAdminAccount = {
  profile: AdminAccountRecord;
  email: string;
  password: string;
  authUserId: string;
};

@Injectable()
export class AdminService {
  constructor(private readonly adminAccessService: AdminAccessService) {}

  private assertAdmin(user: SupabaseJwtPayload): void {
    if (!this.adminAccessService.isAdmin(user)) {
      throw new ForbiddenException('Admin access required');
    }
  }

  listAccounts(): Promise<AdminAccountRecord[]> {
    return prisma.profile.findMany({
      orderBy: { createdAt: 'desc' },
      include: { company: true },
    });
  }

  private async createSupabaseAuthUser(email: string, password: string): Promise<string> {
    const supabaseUrl = process.env.SUPABASE_URL?.trim()?.replace(/\/+$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !serviceRoleKey) {
      throw new ServiceUnavailableException('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to create accounts');
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { account_type: AccountType.developer },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new InternalServerErrorException(`Failed to create Supabase auth user: ${response.status} ${errorBody}`);
    }

    const data = (await response.json()) as { id?: string; user?: { id?: string } };
    const authUserId = data.id ?? data.user?.id;
    if (!authUserId) {
      throw new InternalServerErrorException('Supabase auth user creation returned no id');
    }

    return authUserId;
  }

  async createAccount(user: SupabaseJwtPayload, payload: CreateAdminAccountDto): Promise<CreatedAdminAccount> {
    this.assertAdmin(user);

    const email = payload.email.trim().toLowerCase();
    const password = payload.password?.trim() || randomBytes(12).toString('base64url');
    const authUserId = await this.createSupabaseAuthUser(email, password);

    await prisma.profile.upsert({
      where: { userId: authUserId },
      create: {
        userId: authUserId,
        accountType: payload.accountType,
      },
      update: {
        accountType: payload.accountType,
      },
    });

    if (payload.accountType === AccountType.company) {
      const valuesJson = payload.values ? (payload.values as unknown as Prisma.InputJsonValue) : undefined;
      await prisma.company.create({
        data: {
          ownerUserId: authUserId,
          name: payload.companyName?.trim() || 'Company',
          industry: payload.industry?.trim() || null,
          size: payload.size?.trim() || null,
          // @ts-ignore
          values: valuesJson,
          websiteUrl: payload.websiteUrl?.trim() || null,
          contactEmail: payload.contactEmail?.trim() || null,
        },
      });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: authUserId },
      include: { company: true },
    });

    if (!profile) {
      throw new InternalServerErrorException('Created profile could not be loaded');
    }

    return {
      profile,
      email,
      password,
      authUserId,
    };
  }

  async updateAccount(user: SupabaseJwtPayload, userId: string, payload: UpdateAdminAccountDto): Promise<AdminAccountRecord> {
    this.assertAdmin(user);

    await prisma.profile.update({
      where: { userId },
      data: {
        ...(payload.accountType !== undefined ? { accountType: payload.accountType } : {}),
        ...(payload.archived !== undefined ? { archivedAt: payload.archived ? new Date() : null } : {}),
      },
      include: { company: true },
    });

    if (payload.accountType === AccountType.company || payload.companyName !== undefined || payload.industry !== undefined || payload.size !== undefined || payload.values !== undefined || payload.websiteUrl !== undefined || payload.contactEmail !== undefined || payload.archived !== undefined) {
      const valuesJson = payload.values ? (payload.values as unknown as Prisma.InputJsonValue) : undefined;
      await prisma.company.upsert({
        where: { ownerUserId: userId },
        create: {
          ownerUserId: userId,
          name: payload.companyName?.trim() || 'Company',
          industry: payload.industry?.trim() || null,
          size: payload.size?.trim() || null,
          // @ts-ignore
          values: valuesJson,
          websiteUrl: payload.websiteUrl?.trim() || null,
          contactEmail: payload.contactEmail?.trim() || null,
        },
        update: {
          ...(payload.companyName !== undefined ? { name: payload.companyName.trim() } : {}),
          ...(payload.industry !== undefined ? { industry: payload.industry.trim() || null } : {}),
          ...(payload.size !== undefined ? { size: payload.size.trim() || null } : {}),
          // @ts-ignore
          ...(valuesJson !== undefined ? { values: valuesJson } : {}),
          ...(payload.websiteUrl !== undefined ? { websiteUrl: payload.websiteUrl.trim() || null } : {}),
          ...(payload.contactEmail !== undefined ? { contactEmail: payload.contactEmail.trim() || null } : {}),
          ...(payload.archived !== undefined ? { archivedAt: payload.archived ? new Date() : null } : {}),
        },
      });
    }

    const reloadedProfile = await prisma.profile.findUnique({
      where: { userId },
      include: { company: true },
    });

    if (!reloadedProfile) {
      throw new InternalServerErrorException('Updated profile could not be loaded');
    }

    return reloadedProfile;
  }

  async archiveAccount(user: SupabaseJwtPayload, userId: string, archived: boolean): Promise<AdminAccountRecord> {
    return this.updateAccount(user, userId, { archived });
  }
}