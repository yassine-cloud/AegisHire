import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@aegishire/db';
import type { JobApplication } from '@aegishire/db';
import {
  CreateJobApplicationDto,
  UpdateJobApplicationDto,
} from './dto/job-application.dto';
import { AIGenerationService } from '../ai-generation/ai-generation.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class JobApplicationsService {
  private readonly logger = new Logger(JobApplicationsService.name);

  constructor(
    private prisma: PrismaService,
    private aiGenerationService: AIGenerationService,
  ) {}

  private assertUuid(value: string, fieldName: string): void {
    if (!UUID_PATTERN.test(value)) {
      throw new BadRequestException(`${fieldName} must be a valid UUID`);
    }
  }

  // Parse skills object into flat array
  private parseSkills(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter((s): s is string => typeof s === 'string');
    if (typeof value === 'object') {
      return Object.values(value).flat().filter((s): s is string => typeof s === 'string');
    }
    return [];
  }

  async createApplication(
    candidateId: string,
    dto: CreateJobApplicationDto,
  ): Promise<JobApplication> {
    this.assertUuid(candidateId, 'candidateId');
    this.assertUuid(dto.jobId, 'jobId');

    // Check if already applied to this job
    const existing = await this.prisma.jobApplication.findUnique({
      where: {
        jobId_candidateId: {
          jobId: dto.jobId,
          candidateId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('You have already applied to this job');
    }

    // Verify job exists
    const job = await this.prisma.job.findUnique({
      where: { id: dto.jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const application = await this.prisma.jobApplication.create({
      data: {
        jobId: dto.jobId,
        candidateId,
        generatedEmail: dto.generatedEmail,
        generatedLetter: dto.generatedLetter,
        customNotes: dto.customNotes,
      },
    });

    // Run AI Evaluation in background
    this.triggerEvaluation(application.id, candidateId, job.description);

    return application;
  }

  private async triggerEvaluation(applicationId: string, candidateId: string, jobDescription: string) {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { userId: candidateId },
        select: { skills: true },
      });

      const candidateSkills = this.parseSkills(profile?.skills);
      
      const evaluation = await this.aiGenerationService.evaluateApplication(
        jobDescription,
        candidateSkills,
      );

      await this.prisma.jobApplication.update({
        where: { id: applicationId },
        data: {
          matchScore: evaluation.matchScore,
          resumeSummary: evaluation.resumeSummary,
        },
      });
      this.logger.log(`Successfully generated evaluation for application ${applicationId}`);
    } catch (e) {
      this.logger.error(`Failed to generate evaluation for application ${applicationId}`, e);
    }
  }

  async getApplication(
    applicationId: string,
    candidateId: string,
  ): Promise<JobApplication> {
    this.assertUuid(applicationId, 'applicationId');
    this.assertUuid(candidateId, 'candidateId');

    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.candidateId !== candidateId) {
      throw new BadRequestException('Unauthorized');
    }

    return application;
  }

  async updateApplication(
    applicationId: string,
    candidateId: string,
    dto: UpdateJobApplicationDto,
  ): Promise<JobApplication> {
    const application = await this.getApplication(applicationId, candidateId);

    return this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        status: dto.status ?? application.status,
        generatedEmail: dto.generatedEmail ?? application.generatedEmail,
        generatedLetter: dto.generatedLetter ?? application.generatedLetter,
        customNotes: dto.customNotes ?? application.customNotes,
      },
    });
  }

  async getUserApplications(candidateId: string): Promise<any[]> {
    this.assertUuid(candidateId, 'candidateId');

    return this.prisma.jobApplication.findMany({
      where: {
        candidateId,
        archivedAt: null,
      },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: {
        appliedAt: 'desc',
      },
    });
  }

  async deleteApplication(
    applicationId: string,
    candidateId: string,
  ): Promise<void> {
    await this.getApplication(applicationId, candidateId);

    await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        archivedAt: new Date(),
      },
    });
  }

  async checkIfApplied(jobId: string, candidateId: string): Promise<boolean> {
    this.assertUuid(jobId, 'jobId');
    this.assertUuid(candidateId, 'candidateId');

    const application = await this.prisma.jobApplication.findUnique({
      where: {
        jobId_candidateId: {
          jobId,
          candidateId,
        },
      },
    });

    return !!application;
  }

  async getApplicationWithJob(
    applicationId: string,
    candidateId: string,
  ): Promise<
    | (JobApplication & {
        job: any;
      })
    | null
  > {
    await this.getApplication(applicationId, candidateId);

    return this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
    });
  }
}
