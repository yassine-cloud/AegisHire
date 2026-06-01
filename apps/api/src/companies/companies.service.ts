import { randomBytes } from 'crypto';
import { ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { AccountType, prisma, Prisma } from '@aegishire/db';
import type { Company, Job } from '@aegishire/db';
import type { SupabaseJwtPayload } from '../auth/supabase-jwt.service';
import { AdminAccessService } from '../auth/admin-access.service';
import { UpsertCompanyDto } from './dto/upsert-company.dto';
import { CreateCompanyCredentialsDto } from './dto/create-company-credentials.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

type ProvisionedCompany = {
  company: Company;
  email: string;
  password: string;
  authUserId: string;
};

type AvailableJobRecord = Job & {
  company: Pick<Company, 'id' | 'name' | 'industry' | 'size' | 'websiteUrl' | 'contactEmail'>;
};

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(private readonly adminAccessService: AdminAccessService) {}

  getCompany(userId: string): Promise<Company | null> {
    return prisma.company.findUnique({ where: { ownerUserId: userId } });
  }

  listCompanies(): Promise<Company[]> {
    return prisma.company.findMany({ orderBy: { createdAt: 'desc' } });
  }

  listAvailableJobs(): Promise<AvailableJobRecord[]> {
    return prisma.job.findMany({
      where: {
        status: 'published',
        archivedAt: null,
        company: {
          archivedAt: null,
        },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
            size: true,
            websiteUrl: true,
            contactEmail: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAvailableJob(jobId: string): Promise<AvailableJobRecord> {
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        status: 'published',
        archivedAt: null,
        company: {
          archivedAt: null,
        },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
            size: true,
            websiteUrl: true,
            contactEmail: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async upsertMyCompany(user: SupabaseJwtPayload, payload: UpsertCompanyDto): Promise<Company> {
    const valuesJson = payload.values ? (payload.values as unknown as Prisma.InputJsonValue) : undefined;

    await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accountType: AccountType.company,
      },
      update: {
        accountType: AccountType.company,
      },
    });

    return prisma.company.upsert({
      where: { ownerUserId: user.id },
      create: {
        ownerUserId: user.id,
        name: payload.name?.trim() || 'Company',
        industry: payload.industry?.trim() || null,
        size: payload.size?.trim() || null,
        // @ts-ignore
        values: valuesJson,
        websiteUrl: payload.websiteUrl?.trim() || null,
        description: payload.description?.trim() || null,
        contactEmail: payload.contactEmail?.trim() || null,
      },
      update: {
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.industry !== undefined ? { industry: payload.industry.trim() || null } : {}),
        ...(payload.size !== undefined ? { size: payload.size.trim() || null } : {}),
        // @ts-ignore
        ...(valuesJson !== undefined ? { values: valuesJson } : {}),
        ...(payload.websiteUrl !== undefined ? { websiteUrl: payload.websiteUrl.trim() || null } : {}),
        ...(payload.description !== undefined ? { description: payload.description.trim() || null } : {}),
        ...(payload.contactEmail !== undefined ? { contactEmail: payload.contactEmail.trim() || null } : {}),
      },
    });
  }

  private async createSupabaseAuthUser(email: string, password: string): Promise<string> {
    const supabaseUrl = process.env.SUPABASE_URL?.trim()?.replace(/\/+$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !serviceRoleKey) {
      throw new InternalServerErrorException('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to create company credentials');
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
        user_metadata: { account_type: AccountType.company },
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

  async createCompanyCredentials(user: SupabaseJwtPayload, payload: CreateCompanyCredentialsDto): Promise<ProvisionedCompany> {
    if (!this.adminAccessService.isAdmin(user)) {
      throw new ForbiddenException('Admin access required');
    }

    const email = payload.email.trim().toLowerCase();
    const password = payload.password?.trim() || randomBytes(12).toString('base64url');
    const authUserId = await this.createSupabaseAuthUser(email, password);
    const company = await this.upsertMyCompany({ ...user, id: authUserId }, payload);

    await prisma.profile.upsert({
      where: { userId: authUserId },
      create: {
        userId: authUserId,
        accountType: AccountType.company,
      },
      update: {
        accountType: AccountType.company,
      },
    });

    this.logger.log(`Provisioned company ${company.name} for ${email}`);

    return {
      company,
      email,
      password,
      authUserId,
    };
  }

  private async getOwnedCompanyOrThrow(userId: string): Promise<Company> {
    const company = await prisma.company.findUnique({ where: { ownerUserId: userId } });
    if (!company) {
      throw new NotFoundException('Company record not found');
    }

    if (company.archivedAt) {
      throw new ForbiddenException('Company account is archived');
    }

    return company;
  }

  listMyJobs(userId: string): Promise<Job[]> {
    return prisma.job.findMany({
      where: { company: { ownerUserId: userId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMyJob(userId: string, payload: CreateJobDto): Promise<Job> {
    const company = await this.getOwnedCompanyOrThrow(userId);
    const responsibilities = payload.responsibilities as unknown as Prisma.InputJsonValue | undefined;
    const requirements = payload.requirements as unknown as Prisma.InputJsonValue | undefined;

    return prisma.job.create({
      data: {
        companyId: company.id,
        title: payload.title.trim(),
        location: payload.location?.trim() || null,
        employmentType: payload.employmentType?.trim() || null,
        description: payload.description.trim(),
        // @ts-ignore
        responsibilities,
        // @ts-ignore
        requirements,
        salaryRange: payload.salaryRange?.trim() || null,
      },
    });
  }

  async updateMyJob(userId: string, jobId: string, payload: UpdateJobDto): Promise<Job> {
    const company = await this.getOwnedCompanyOrThrow(userId);
    const current = await prisma.job.findFirst({ where: { id: jobId, companyId: company.id } });

    if (!current) {
      throw new NotFoundException('Job not found');
    }

    const responsibilities = payload.responsibilities as unknown as Prisma.InputJsonValue | undefined;
    const requirements = payload.requirements as unknown as Prisma.InputJsonValue | undefined;

    return prisma.job.update({
      where: { id: jobId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
        ...(payload.location !== undefined ? { location: payload.location.trim() || null } : {}),
        ...(payload.employmentType !== undefined ? { employmentType: payload.employmentType.trim() || null } : {}),
        ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
        // @ts-ignore
        ...(responsibilities !== undefined ? { responsibilities } : {}),
        // @ts-ignore
        ...(requirements !== undefined ? { requirements } : {}),
        ...(payload.salaryRange !== undefined ? { salaryRange: payload.salaryRange.trim() || null } : {}),
        ...(payload.status !== undefined ? { status: payload.status.trim() } : {}),
        ...(payload.archived !== undefined ? { archivedAt: payload.archived ? new Date() : null } : {}),
      },
    });
  }
}