import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@aegishire/db';
import type { JobApplication } from '@aegishire/db';
import { CreateJobApplicationDto, UpdateJobApplicationDto } from './dto/job-application.dto';

@Injectable()
export class JobApplicationsService {
  constructor(private prisma: PrismaService) {}

  async createApplication(candidateId: string, dto: CreateJobApplicationDto): Promise<JobApplication> {
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

    return this.prisma.jobApplication.create({
      data: {
        jobId: dto.jobId,
        candidateId,
        generatedEmail: dto.generatedEmail,
        generatedLetter: dto.generatedLetter,
        customNotes: dto.customNotes,
      },
    });
  }

  async getApplication(applicationId: string, candidateId: string): Promise<JobApplication> {
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

  async getUserApplications(candidateId: string): Promise<JobApplication[]> {
    return this.prisma.jobApplication.findMany({
      where: {
        candidateId,
        archivedAt: null,
      },
      orderBy: {
        appliedAt: 'desc',
      },
    });
  }

  async deleteApplication(applicationId: string, candidateId: string): Promise<void> {
    const application = await this.getApplication(applicationId, candidateId);

    await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        archivedAt: new Date(),
      },
    });
  }

  async checkIfApplied(jobId: string, candidateId: string): Promise<boolean> {
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

  async getApplicationWithJob(applicationId: string, candidateId: string) {
    const application = await this.getApplication(applicationId, candidateId);

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
