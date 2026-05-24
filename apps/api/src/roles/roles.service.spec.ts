import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { prisma } from '@aegishire/db';
import { RedisService } from '../shared/redis/redis.service';
import { RolesService } from './roles.service';

jest.mock('@aegishire/db', () => ({
  prisma: {
    role: { findUnique: jest.fn() },
    roleMatch: { findUnique: jest.fn() },
    profile: { findUnique: jest.fn() },
    gapReport: { upsert: jest.fn() },
  },
}));

type PrismaMock = {
  role: { findUnique: jest.Mock };
  roleMatch: { findUnique: jest.Mock };
  profile: { findUnique: jest.Mock };
  gapReport: { upsert: jest.Mock };
};

const workerFixturePath = path.join(__dirname, '__fixtures__', 'gap-report-worker-response.json');
const workerFixture = JSON.parse(fs.readFileSync(workerFixturePath, 'utf-8')) as {
  gaps: Array<{
    skill: string;
    importance: 'high' | 'medium' | 'low';
    current_level: 'none' | 'beginner' | 'intermediate';
    recommendation: string;
    estimated_effort: string;
  }>;
  overall_priority_order: string[];
};

describe('RolesService', () => {
  let service: RolesService;
  let prismaMock: PrismaMock;

  const httpServiceMock = {
    post: jest.fn(),
  };

  const redisServiceMock = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPattern: jest.fn(),
  };

  beforeEach(async () => {
    process.env.WORKER_BASE_URL = 'http://localhost:8000';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: HttpService,
          useValue: httpServiceMock,
        },
        {
          provide: RedisService,
          useValue: redisServiceMock,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    prismaMock = prisma as unknown as PrismaMock;

    jest.clearAllMocks();
    prismaMock.role.findUnique.mockResolvedValue({ id: 10, slug: 'senior-backend-engineer' });
    prismaMock.roleMatch.findUnique.mockResolvedValue({ compatibilityScore: 67 });
    prismaMock.profile.findUnique.mockResolvedValue({ graphBuiltAt: new Date('2026-04-01T00:00:00.000Z') });
    prismaMock.gapReport.upsert.mockResolvedValue({});
  });

  it('returns gap report on cache miss then stores DB + cache', async () => {
    redisServiceMock.get.mockResolvedValue(null);
    httpServiceMock.post.mockReturnValue(of({ data: workerFixture }));

    const result = await service.getGapReport('candidate-1', 'senior-backend-engineer');

    expect(result.role_id).toBe('senior-backend-engineer');
    expect(result.compatibility_score).toBe(67);
    expect(result.gaps).toHaveLength(1);
    expect(prismaMock.gapReport.upsert).toHaveBeenCalledTimes(1);
    expect(redisServiceMock.set).toHaveBeenCalledWith(
      'gap_report:candidate-1:senior-backend-engineer',
      expect.any(String),
      86400,
    );
  });

  it('returns cache hit and does not call worker', async () => {
    redisServiceMock.get.mockResolvedValue(JSON.stringify(workerFixture));

    const result = await service.getGapReport('candidate-1', 'senior-backend-engineer');

    expect(result.gaps).toHaveLength(1);
    expect(httpServiceMock.post).not.toHaveBeenCalled();
    expect(prismaMock.gapReport.upsert).not.toHaveBeenCalled();
  });

  it('throws NO_GAPS_ABOVE_THRESHOLD when score is >= 70', async () => {
    prismaMock.roleMatch.findUnique.mockResolvedValue({ compatibilityScore: 75 });

    await expect(service.getGapReport('candidate-1', 'senior-backend-engineer')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    await expect(service.getGapReport('candidate-1', 'senior-backend-engineer')).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'NO_GAPS_ABOVE_THRESHOLD' }),
    });

    expect(httpServiceMock.post).not.toHaveBeenCalled();
  });

  it('throws ROLE_NOT_FOUND when role match does not exist', async () => {
    prismaMock.roleMatch.findUnique.mockResolvedValue(null);

    await expect(service.getGapReport('candidate-1', 'senior-backend-engineer')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(httpServiceMock.post).not.toHaveBeenCalled();
  });

  it('throws PROFILE_INCOMPLETE when graph is missing', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ graphBuiltAt: null });

    await expect(service.getGapReport('candidate-1', 'senior-backend-engineer')).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'PROFILE_INCOMPLETE' }),
    });

    expect(httpServiceMock.post).not.toHaveBeenCalled();
  });

  it('maps worker 5xx to WORKER_UNAVAILABLE', async () => {
    redisServiceMock.get.mockResolvedValue(null);
    const axiosError = {
      isAxiosError: true,
      response: { status: 503 },
      code: 'ERR_BAD_RESPONSE',
    } as AxiosError;
    httpServiceMock.post.mockReturnValue(throwError(() => axiosError));

    await expect(service.getGapReport('candidate-1', 'senior-backend-engineer')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    await expect(service.getGapReport('candidate-1', 'senior-backend-engineer')).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'WORKER_UNAVAILABLE' }),
    });
  });

  it('maps worker timeout to WORKER_UNAVAILABLE', async () => {
    redisServiceMock.get.mockResolvedValue(null);
    const timeoutError = new AxiosError('timeout', 'ECONNABORTED');
    httpServiceMock.post.mockReturnValue(throwError(() => timeoutError));

    await expect(service.getGapReport('candidate-1', 'senior-backend-engineer')).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'WORKER_UNAVAILABLE' }),
    });
  });
});
