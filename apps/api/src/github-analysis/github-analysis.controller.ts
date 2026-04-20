import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { GithubAnalysisService } from './github-analysis.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';


@Controller('github-analysis')
export class GithubAnalysisController {
  constructor(private readonly service: GithubAnalysisService) {}

  @UseGuards(SupabaseAuthGuard)
  @Post('trigger')
  trigger(@Request() req, @Body() body: { githubUsername: string }) {
    return this.service.triggerAnalysis(req.user.sub, body.githubUsername);
  }
}