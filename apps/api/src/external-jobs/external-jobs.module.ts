import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExternalJobsController } from './external-jobs.controller';
import { ExternalJobsService } from './external-jobs.service';

@Module({
  imports: [AuthModule, HttpModule],
  controllers: [ExternalJobsController],
  providers: [ExternalJobsService],
})
export class ExternalJobsModule {}
