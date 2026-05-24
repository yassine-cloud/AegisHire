import '../../test/mocks/jose.mock';
import { BadRequestException, CanActivate, ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

class HeaderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: { id: string } }>();
    if (!req.headers.authorization) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    req.user = { id: 'candidate-1' };
    return true;
  }
}

describe('RolesController', () => {
  let app: INestApplication;

  const rolesServiceMock = {
    getGapReport: jest.fn(),
    seedTestData: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: rolesServiceMock,
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useClass(HeaderAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /roles/:id/gap-report returns 200 with valid auth', async () => {
    rolesServiceMock.getGapReport.mockResolvedValue({
      role_id: 'senior-backend-engineer',
      compatibility_score: 67,
      gaps: [
        {
          skill: 'Kubernetes',
          importance: 'high',
          current_level: 'none',
          recommendation: 'Deploy one project on Minikube.',
          estimated_effort: '3-4 weeks',
        },
      ],
      overall_priority_order: ['Kubernetes'],
    });

    await request(app.getHttpServer())
      .get('/roles/senior-backend-engineer/gap-report')
      .set('Authorization', 'Bearer token')
      .expect(200)
      .expect(({ body }: { body: { role_id: string } }) => {
        expect(body.role_id).toBe('senior-backend-engineer');
      });
  });

  it('GET /roles/:id/gap-report returns 401 with no auth', async () => {
    await request(app.getHttpServer()).get('/roles/senior-backend-engineer/gap-report').expect(401);
  });

  it('POST /roles/test-setup returns 200 with valid auth', async () => {
    rolesServiceMock.seedTestData.mockResolvedValue({
      roleSlug: 'software-engineer',
      roleTitle: 'Software Engineer',
      compatibilityScore: 40,
      missingSkills: ['TypeScript', 'Docker'],
      message: 'Role and role-match seeded successfully.',
    });

    await request(app.getHttpServer())
      .post('/roles/test-setup')
      .set('Authorization', 'Bearer token')
      .expect(201)
      .expect(({ body }: { body: { roleSlug: string } }) => {
        expect(body.roleSlug).toBe('software-engineer');
      });
  });

  it('POST /roles/test-setup returns 401 with no auth', async () => {
    await request(app.getHttpServer()).post('/roles/test-setup').expect(401);
  });

  it('GET /roles/:id/gap-report returns 400 and NO_GAPS_ABOVE_THRESHOLD', async () => {
    rolesServiceMock.getGapReport.mockRejectedValue(
      new BadRequestException({
        statusCode: 400,
        error: 'NO_GAPS_ABOVE_THRESHOLD',
        message: 'Candidate already meets or exceeds the threshold for this role.',
        timestamp: new Date().toISOString(),
      }),
    );

    await request(app.getHttpServer())
      .get('/roles/senior-backend-engineer/gap-report')
      .set('Authorization', 'Bearer token')
      .expect(400)
      .expect(({ body }: { body: { error: string } }) => {
        expect(body.error).toBe('NO_GAPS_ABOVE_THRESHOLD');
      });
  });
});
