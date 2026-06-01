import { Module } from '@nestjs/common';
import { JobApplicationsService } from './job-applications.service';
import { JobApplicationsController } from './job-applications.controller';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../shared/database/database.module';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [JobApplicationsController],
  providers: [JobApplicationsService],
  exports: [JobApplicationsService],
})
export class JobApplicationsModule {}
