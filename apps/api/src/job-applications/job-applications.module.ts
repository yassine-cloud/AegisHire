import { Module } from '@nestjs/common';
import { JobApplicationsService } from './job-applications.service';
import { JobApplicationsController } from './job-applications.controller';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../shared/database/database.module';
import { AIGenerationModule } from '../ai-generation/ai-generation.module';

@Module({
  imports: [AuthModule, DatabaseModule, AIGenerationModule],
  controllers: [JobApplicationsController],
  providers: [JobApplicationsService],
  exports: [JobApplicationsService],
})
export class JobApplicationsModule {}
