import { Module } from '@nestjs/common';
import { GithubAnalysisController } from './github-analysis.controller';
import { GithubAnalysisService } from './github-analysis.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GithubAnalysisController],
  providers: [GithubAnalysisService],
})
export class GithubAnalysisModule {}
