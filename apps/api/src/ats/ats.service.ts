import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma, ApplicationStatus } from '@aegishire/db';
import { RedisService } from '../shared/redis/redis.service';
import { UpdateStageDto } from './dto/update-stage.dto';

type KanbanStatus = 'PENDING' | 'REVIEW' | 'ACCEPTED' | 'REJECTED';

export interface CandidateDto {
  id: string;
  name: string;
  jobTitle: string;
  jobId: string;
  skills: string[];
  matchScore: number;
  resumeSummary: string;
  status: KanbanStatus;
  appliedAt: string;
}

function parseSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === 'string');
}

function mapJobStatus(status: string): KanbanStatus {
  switch (status.toLowerCase()) {
    case 'accepted':
    case 'hired':
      return 'ACCEPTED';
    case 'rejected':
      return 'REJECTED';
    case 'shortlisted':
    case 'review':
    case 'viewed':
      return 'REVIEW';
    default:
      return 'PENDING';
  }
}

@Injectable()
export class AtsService {
  private readonly logger = new Logger(AtsService.name);

  constructor(private readonly redisService: RedisService) {}

  async updateStage(
    candidateId: string,
    dto: UpdateStageDto,
  ): Promise<{ candidateId: string; jobId: string; newStatus: ApplicationStatus }> {
    const { jobId, newStatus } = dto;

    const application = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId, jobId } },
      select: { status: true },
    });

    if (!application) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'APPLICATION_NOT_FOUND',
        message: 'No application found for this candidate and job.',
        timestamp: new Date().toISOString(),
      });
    }

    const fromStatus = application.status;

    await prisma.$transaction([
      prisma.application.update({
        where: { candidateId_jobId: { candidateId, jobId } },
        data: { status: newStatus },
      }),
      prisma.auditLog.create({
        data: { candidateId, jobId, fromStatus, toStatus: newStatus },
      }),
    ]);

    await this.invalidateCache(candidateId);

    return { candidateId, jobId, newStatus };
  }

  async getAuditLog(candidateId: string): Promise<
    {
      id: string;
      candidateId: string;
      jobId: string;
      fromStatus: ApplicationStatus;
      toStatus: ApplicationStatus;
      changedAt: Date;
    }[]
  > {
    return prisma.auditLog.findMany({
      where: { candidateId },
      orderBy: { changedAt: 'desc' },
    });
  }

  async getCandidates(userId: string): Promise<CandidateDto[]> {
    const company = await prisma.company.findUnique({
      where: { ownerUserId: userId },
      select: { id: true },
    });

    if (!company) return [];

    const jobs = await prisma.job.findMany({
      where: { companyId: company.id, archivedAt: null },
      select: { id: true, title: true },
    });

    if (jobs.length === 0) return [];

    const jobIds = jobs.map((j) => j.id);

    const applications = await prisma.jobApplication.findMany({
      where: { jobId: { in: jobIds }, archivedAt: null },
      include: { job: { select: { title: true } } },
      orderBy: { appliedAt: 'desc' },
    });

    if (applications.length === 0) return [];

    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: candidateIds } },
      select: { userId: true, githubUsername: true, skills: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return applications.map((app) => {
      const profile = profileMap.get(app.candidateId);
      return {
        id: app.id,
        name: profile?.githubUsername ?? 'Unknown',
        jobTitle: app.job.title,
        jobId: app.jobId,
        skills: parseSkills(profile?.skills),
        matchScore: 0,
        resumeSummary: '',
        status: mapJobStatus(app.status),
        appliedAt: app.appliedAt.toISOString().split('T')[0],
      };
    });
  }

  private async invalidateCache(candidateId: string): Promise<void> {
    try {
      await this.redisService.delByPattern(`ats:${candidateId}:*`);
    } catch (error) {
      this.logger.warn(
        `Redis invalidation failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
