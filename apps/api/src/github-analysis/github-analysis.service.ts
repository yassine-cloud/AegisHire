import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { prisma } from '@aegishire/db';

@Injectable()
export class GithubAnalysisService {
  async triggerAnalysis(userId: string, githubUsername: string) {
    const workerUrl = process.env.WORKER_URL ?? 'http://127.0.0.1:8000';

    const response = await fetch(`${workerUrl}/analyze/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ github_username: githubUsername }),
    });

    if (response.status === 503) {
      throw new HttpException(
        'GitHub API unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (response.status === 422) {
      throw new HttpException(
        'INSUFFICIENT_DATA',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (!response.ok) {
      throw new HttpException('Analysis failed', HttpStatus.BAD_GATEWAY);
    }

    const result = await response.json();

    await prisma.profile.upsert({
      where: { userId },
      create: { userId, githubUsername, githubAnalyzedAt: new Date() },
      update: { githubUsername, githubAnalyzedAt: new Date() },
    });

    return result;
  }
}
