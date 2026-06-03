import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma, ApplicationStatus } from '@aegishire/db';
import { RedisService } from '../shared/redis/redis.service';
import { AIGenerationService } from '../ai-generation/ai-generation.service';
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
  generatedEmail?: string | null;
  motivationLetter?: string | null;
  status: KanbanStatus;
  appliedAt: string;
}

function parseSkills(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((s): s is string => typeof s === 'string');
  if (typeof value === 'object') {
    return Object.values(value).flat().filter((s): s is string => typeof s === 'string');
  }
  return [];
}

function skillMatchesDescription(skill: string, desc: string): boolean {
  const s = skill.toLowerCase().trim();
  if (!s || s.length < 2) return false;

  // Direct match
  if (desc.includes(s)) return true;

  // Normalize: remove separators (. - _ / \) and check
  const normalized = s.replace(/[-._/\\]/g, '');
  if (normalized !== s && desc.includes(normalized)) return true;

  // Check individual words for compound skills (e.g. "Node.js" -> ["node", "js"])
  const words = s.split(/[-._/\\\s]+/).filter((w) => w.length > 1);
  if (words.length > 1) {
    const matchedWords = words.filter((w) => desc.includes(w));
    if (matchedWords.length >= Math.ceil(words.length / 2)) return true;
  }

  return false;
}

function calculateMatchScore(jobDescription: string, candidateSkills: string[]): number {
  if (!candidateSkills || candidateSkills.length === 0 || !jobDescription) return 0;

  const descLower = jobDescription.toLowerCase();
  const matched = candidateSkills.filter((skill) =>
    skillMatchesDescription(skill, descLower),
  );

  return Math.round((matched.length / candidateSkills.length) * 100);
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

  constructor(
    private readonly redisService: RedisService,
    private readonly aiGenerationService: AIGenerationService,
  ) {}

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
      select: { id: true, title: true, description: true },
    });

    if (jobs.length === 0) return [];

    const jobIds = jobs.map((j) => j.id);
    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    const applications = await prisma.jobApplication.findMany({
      where: { jobId: { in: jobIds }, archivedAt: null },
      include: { job: { select: { title: true, description: true } } },
      orderBy: { appliedAt: 'desc' },
    });

    if (applications.length === 0) return [];

    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: candidateIds } },
      select: { userId: true, githubUsername: true, skills: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const results = await Promise.all(
      applications.map(async (app) => {
        const profile = profileMap.get(app.candidateId);
        const candidateSkills = parseSkills(profile?.skills);
        const job = jobMap.get(app.jobId);
        let matchScore = app.matchScore;
        let resumeSummary = app.resumeSummary;

        if (matchScore == null || matchScore <= 0) {
          try {
            const evaluation = await this.aiGenerationService.evaluateApplication(
              job?.description ?? '',
              candidateSkills,
            );
            matchScore = evaluation.matchScore;
            resumeSummary = evaluation.resumeSummary;

            await prisma.jobApplication.update({
              where: { id: app.id },
              data: { matchScore, resumeSummary },
            });
          } catch {
            matchScore = calculateMatchScore(job?.description ?? '', candidateSkills);
          }
        }

        return {
          id: app.id,
          name: profile?.githubUsername ?? 'Unknown',
          jobTitle: app.job.title,
          jobId: app.jobId,
          skills: candidateSkills,
          matchScore,
          resumeSummary: resumeSummary ?? '',
          generatedEmail: app.generatedEmail,
          motivationLetter: app.generatedLetter,
          status: mapJobStatus(app.status),
          appliedAt: app.appliedAt.toISOString().split('T')[0],
        };
      }),
    );

    return results;
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
