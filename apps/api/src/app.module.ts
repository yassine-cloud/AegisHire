import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';
import { ProfilesModule } from './profile/profile.module';
import { RolesModule } from './roles/roles.module';
import { RedisModule } from './shared/redis/redis.module';
import { GithubAnalysisModule } from './github-analysis/github-analysis.module';
import { CompaniesModule } from './companies/companies.module';
import { AdminModule } from './admin/admin.module';
import { GraphSkillModule } from './graph-skill/graph-skill.module';
import { AIGenerationModule } from './ai-generation/ai-generation.module';
import { JobApplicationsModule } from './job-applications/job-applications.module';
import { ExternalJobsModule } from './external-jobs/external-jobs.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    AuthModule,
    RedisModule,
    ProfilesModule,
    CompaniesModule,
    AdminModule,
    RolesModule,
    GithubAnalysisModule,
    GraphSkillModule,
    AIGenerationModule,
    JobApplicationsModule,
    ExternalJobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
