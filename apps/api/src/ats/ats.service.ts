import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma, ApplicationStatus } from '@aegishire/db';
import { RedisService } from '../shared/redis/redis.service';
import { UpdateStageDto } from './dto/update-stage.dto';

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
