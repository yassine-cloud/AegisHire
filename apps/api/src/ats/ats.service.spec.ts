import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AtsService } from './ats.service';
import { RedisService } from '../shared/redis/redis.service';

jest.mock('@aegishire/db', () => {
  const mockFindUnique = jest.fn();
  const mockUpdate = jest.fn();
  const mockCreate = jest.fn();
  const mockFindMany = jest.fn();
  const mockTransaction = jest.fn();

  return {
    prisma: {
      application: { findUnique: mockFindUnique, update: mockUpdate },
      auditLog: { create: mockCreate, findMany: mockFindMany },
      $transaction: mockTransaction,
    },
    ApplicationStatus: {
      PENDING: 'PENDING',
      REVIEW: 'REVIEW',
      ACCEPTED: 'ACCEPTED',
      REJECTED: 'REJECTED',
    },
  };
});

import { prisma } from '@aegishire/db';

describe('AtsService', () => {
  let service: AtsService;
  let redisService: jest.Mocked<Pick<RedisService, 'delByPattern'>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AtsService,
        {
          provide: RedisService,
          useValue: { delByPattern: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(AtsService);
    redisService = module.get(RedisService);
  });

  describe('updateStage', () => {
    const candidateId = 'a1b2c3d4-0000-0000-0000-000000000001';
    const jobId = 'a1b2c3d4-0000-0000-0000-000000000002';

    it('transitions stage from PENDING to REVIEW and invalidates cache', async () => {
      (prisma.application.findUnique as jest.Mock).mockResolvedValue({
        status: 'PENDING',
      });
      (prisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

      const result = await service.updateStage(candidateId, {
        jobId,
        newStatus: 'REVIEW' as any,
      });

      expect(prisma.application.findUnique).toHaveBeenCalledWith({
        where: { candidateId_jobId: { candidateId, jobId } },
        select: { status: true },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(redisService.delByPattern).toHaveBeenCalledWith(
        `ats:${candidateId}:*`,
      );
      expect(result).toEqual({ candidateId, jobId, newStatus: 'REVIEW' });
    });

    it('throws NotFoundException when application does not exist', async () => {
      (prisma.application.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateStage(candidateId, {
          jobId,
          newStatus: 'ACCEPTED' as any,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
