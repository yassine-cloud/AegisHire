import '../../test/mocks/jose.mock';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesController } from './profile.controller';
import { ProfilesService } from './profile.service';

describe('ProfilesController', () => {
  let controller: ProfilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [ProfilesService],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(EmailVerifiedGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProfilesController>(ProfilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
