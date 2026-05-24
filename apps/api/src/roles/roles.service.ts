import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { prisma } from '@aegishire/db';
import type { Prisma } from '@aegishire/db';
import { RedisService } from '../shared/redis/redis.service';
import { GapEntryDto, GapReportResponseDto } from './dto/gap-report.dto';
import { TestSetupRequestDto } from './dto/test-setup-request.dto';
import { TestSetupResponseDto } from './dto/test-setup.dto';

type WorkerGapReport = {
  gaps: GapEntryDto[];
  overall_priority_order: string[];
};

/**
 * Roles service that orchestrates gap-report generation and caching.
 */
@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);
  private static readonly GAP_REPORT_TTL_SECONDS = 86400;

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get candidate gap report for a role slug with Redis cache and worker fallback.
   */
  async getGapReport(candidateId: string, roleSlug: string): Promise<GapReportResponseDto> {
    const role = await prisma.role.findUnique({
      where: { slug: roleSlug },
      select: { id: true, slug: true },
    });

    if (!role) {
      throw new NotFoundException(this.errorEnvelope(HttpStatus.NOT_FOUND, 'ROLE_NOT_FOUND', 'Role not found.'));
    }

    const roleMatch = await prisma.roleMatch.findUnique({
      where: { candidateId_roleId: { candidateId, roleId: role.id } },
      select: { compatibilityScore: true },
    });

    if (!roleMatch) {
      throw new NotFoundException(
        this.errorEnvelope(HttpStatus.NOT_FOUND, 'ROLE_NOT_FOUND', 'Role match not found for this candidate.'),
      );
    }

    const compatibilityScore = roleMatch.compatibilityScore ?? 0;
    if (compatibilityScore >= 70) {
      throw new BadRequestException(
        this.errorEnvelope(
          HttpStatus.BAD_REQUEST,
          'NO_GAPS_ABOVE_THRESHOLD',
          'Candidate already meets or exceeds the threshold for this role.',
        ),
      );
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: candidateId },
      select: { graphBuiltAt: true },
    });

    if (!profile?.graphBuiltAt) {
      throw new BadRequestException(
        this.errorEnvelope(
          HttpStatus.BAD_REQUEST,
          'PROFILE_INCOMPLETE',
          'Candidate skill graph has not been built yet.',
        ),
      );
    }

    const cacheKey = this.buildCacheKey(candidateId, roleSlug);
    const cachedReport = await this.getCachedReport(cacheKey);
    if (cachedReport) {
      return {
        role_id: role.slug,
        compatibility_score: compatibilityScore,
        gaps: cachedReport.gaps,
        overall_priority_order: cachedReport.overall_priority_order,
      };
    }

    const workerResult = await this.fetchReportFromWorker(candidateId, roleSlug);

    const response: GapReportResponseDto = {
      role_id: role.slug,
      compatibility_score: compatibilityScore,
      gaps: workerResult.gaps,
      overall_priority_order: workerResult.overall_priority_order,
    };

    await prisma.gapReport.upsert({
      where: { candidateId_roleId: { candidateId, roleId: role.id } },
      create: {
        candidateId,
        roleId: role.id,
        gaps: response.gaps as unknown as Prisma.InputJsonValue,
        priorityOrder: response.overall_priority_order as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + RolesService.GAP_REPORT_TTL_SECONDS * 1000),
      },
      update: {
        gaps: response.gaps as unknown as Prisma.InputJsonValue,
        priorityOrder: response.overall_priority_order as unknown as Prisma.InputJsonValue,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + RolesService.GAP_REPORT_TTL_SECONDS * 1000),
      },
    });

    await this.setCachedReport(cacheKey, response);
    return response;
  }

  private buildCacheKey(candidateId: string, roleSlug: string): string {
    return `gap_report:${candidateId}:${roleSlug}`;
  }

  private async getCachedReport(cacheKey: string): Promise<WorkerGapReport | null> {
    try {
      const cached = await this.redisService.get(cacheKey);
      if (!cached) {
        return null;
      }

      return this.parseWorkerGapReport(JSON.parse(cached) as unknown);
    } catch (error) {
      this.logger.warn(`Redis read failed. Continuing without cache. ${this.stringifyError(error)}`);
      return null;
    }
  }

  private async setCachedReport(cacheKey: string, report: GapReportResponseDto): Promise<void> {
    try {
      await this.redisService.set(cacheKey, JSON.stringify(report), RolesService.GAP_REPORT_TTL_SECONDS);
    } catch (error) {
      this.logger.warn(`Redis write failed. Continuing without cache. ${this.stringifyError(error)}`);
    }
  }

  private async fetchReportFromWorker(candidateId: string, roleSlug: string): Promise<WorkerGapReport> {
    const workerBaseUrl = process.env.WORKER_BASE_URL;
    if (!workerBaseUrl) {
      throw new ServiceUnavailableException(
        this.errorEnvelope(HttpStatus.SERVICE_UNAVAILABLE, 'WORKER_UNAVAILABLE', 'Worker base URL is missing.'),
      );
    }

    try {
      const workerResponse = await firstValueFrom(
        this.httpService.post<unknown>(
          `${workerBaseUrl}/worker/generate-report`,
          {
            candidate_id: candidateId,
            role_id: roleSlug,
          },
          {
            timeout: 25000,
          },
        ),
      );

      return this.parseWorkerGapReport(workerResponse.data);
    } catch (error) {
      const axiosError = error as AxiosError;
      const isTimeout = axiosError.code === 'ECONNABORTED';
      const isServerError = (axiosError.response?.status ?? 0) >= 500;

      if (isTimeout || isServerError || axiosError.isAxiosError) {
        throw new ServiceUnavailableException(
          this.errorEnvelope(
            HttpStatus.SERVICE_UNAVAILABLE,
            'WORKER_UNAVAILABLE',
            'Gap report worker is unavailable. Please try again later.',
          ),
        );
      }

      throw error;
    }
  }

  private parseWorkerGapReport(value: unknown): WorkerGapReport {
    if (!this.isObject(value)) {
      throw new ServiceUnavailableException(
        this.errorEnvelope(HttpStatus.SERVICE_UNAVAILABLE, 'WORKER_UNAVAILABLE', 'Worker returned an invalid payload.'),
      );
    }

    const gaps = value['gaps'];
    const overallPriorityOrder = value['overall_priority_order'];

    if (!Array.isArray(gaps) || !Array.isArray(overallPriorityOrder)) {
      throw new ServiceUnavailableException(
        this.errorEnvelope(HttpStatus.SERVICE_UNAVAILABLE, 'WORKER_UNAVAILABLE', 'Worker returned an invalid payload.'),
      );
    }

    const validatedGaps = gaps.map((gap) => this.parseGapEntry(gap));
    const validatedOrder = overallPriorityOrder.filter((item): item is string => typeof item === 'string');

    return {
      gaps: validatedGaps,
      overall_priority_order: validatedOrder,
    };
  }

  private parseGapEntry(value: unknown): GapEntryDto {
    if (!this.isObject(value)) {
      throw new ServiceUnavailableException(
        this.errorEnvelope(HttpStatus.SERVICE_UNAVAILABLE, 'WORKER_UNAVAILABLE', 'Worker returned an invalid gap entry.'),
      );
    }

    const { skill, importance, current_level, recommendation, estimated_effort } = value;

    if (typeof skill !== 'string' || typeof recommendation !== 'string' || typeof estimated_effort !== 'string') {
      throw new ServiceUnavailableException(
        this.errorEnvelope(HttpStatus.SERVICE_UNAVAILABLE, 'WORKER_UNAVAILABLE', 'Worker returned an invalid gap entry.'),
      );
    }

    if (!this.isImportance(importance) || !this.isCurrentLevel(current_level)) {
      throw new ServiceUnavailableException(
        this.errorEnvelope(HttpStatus.SERVICE_UNAVAILABLE, 'WORKER_UNAVAILABLE', 'Worker returned an invalid gap entry.'),
      );
    }

    return {
      skill,
      importance,
      current_level,
      recommendation,
      estimated_effort,
    };
  }

  private errorEnvelope(statusCode: number, error: string, message: string): {
    statusCode: number;
    error: string;
    message: string;
    timestamp: string;
  } {
    return {
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private isImportance(value: unknown): value is GapEntryDto['importance'] {
    return value === 'high' || value === 'medium' || value === 'low';
  }

  private isCurrentLevel(value: unknown): value is GapEntryDto['current_level'] {
    return value === 'none' || value === 'beginner' || value === 'intermediate';
  }

  private stringifyError(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }

  /**
   * Seed a test role + role-match for local gap-report testing.
   * The missing skills are a representative set that a "software-engineer"
   * role would typically require beyond a basic CV.
   */
  async seedTestData(candidateId: string, payload?: TestSetupRequestDto): Promise<TestSetupResponseDto> {
    const roleSlug = payload?.roleSlug?.trim() || 'software-engineer';
    const roleTitle = payload?.roleTitle?.trim() || 'Software Engineer';
    const compatibilityScore = Math.max(0, Math.min(69, payload?.compatibilityScore ?? 40));
    const missingSkillsInput = (payload?.missingSkills ?? ['TypeScript', 'Docker', 'System Design', 'CI/CD', 'PostgreSQL'])
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);
    const missingSkills = missingSkillsInput.length > 0 ? missingSkillsInput : ['TypeScript', 'Docker', 'System Design'];
    const requiredSkills = missingSkills.map((skill, index) => ({
      skill,
      importance: index < 3 ? 'high' : 'medium',
    }));

    const role = await prisma.role.upsert({
      where: { slug: roleSlug },
      create: {
        slug: roleSlug,
        title: roleTitle,
        description: 'A general software engineering position requiring full-stack capabilities.',
        requiredSkills: requiredSkills as unknown as Prisma.InputJsonValue,
        preferredSkills: [] as unknown as Prisma.InputJsonValue,
      },
      update: {
        title: roleTitle,
        requiredSkills: requiredSkills as unknown as Prisma.InputJsonValue,
      },
    });

    const missingSkillsPayload = missingSkills.map((skill) => ({
      skill,
      importance: requiredSkills.find((r) => r.skill === skill)?.importance ?? 'low',
    }));

    await prisma.roleMatch.upsert({
      where: { candidateId_roleId: { candidateId, roleId: role.id } },
      create: {
        candidateId,
        roleId: role.id,
        compatibilityScore,
        matchedSkills: [] as unknown as Prisma.InputJsonValue,
        missingSkills: missingSkillsPayload as unknown as Prisma.InputJsonValue,
      },
      update: {
        compatibilityScore,
        missingSkills: missingSkillsPayload as unknown as Prisma.InputJsonValue,
      },
    });

    // Gap report API requires graphBuiltAt; seeding marks the profile ready for the tester flow.
    await prisma.profile.upsert({
      where: { userId: candidateId },
      create: {
        userId: candidateId,
        graphBuiltAt: new Date(),
      },
      update: {
        graphBuiltAt: new Date(),
      },
    });

    // Invalidate any existing cached gap report
    try {
      await this.redisService.delByPattern(`gap_report:${candidateId}:${roleSlug}`);
    } catch (_) {
      // non-critical
    }

    return {
      roleSlug,
      roleTitle,
      compatibilityScore,
      missingSkills,
      message: 'Role and role-match seeded successfully.',
    };
  }
}
