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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
