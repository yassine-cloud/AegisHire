import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RebuildGraphDto } from './dto/rebuild-graph.dto';

@Injectable()
export class GraphSkillService {
  private readonly workerUrl: string;

  constructor(private readonly config: ConfigService) {
    this.workerUrl =
      this.config.get<string>('WORKER_BASE_URL') ?? 'http://127.0.0.1:8000';
  }

  /**
   * Proxy a rebuild request to the Python worker's
   * POST /graph-skill/rebuild endpoint.
   */
  async rebuild(dto: RebuildGraphDto) {
    const response = await fetch(`${this.workerUrl}/graph-skill/rebuild`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: dto.candidateId,
        candidate_name: dto.candidateName,
        cv_data: dto.cvData ?? {},
        github_data: dto.githubData ?? {},
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => 'Unknown error');
      throw new HttpException(
        `Graph rebuild failed: ${detail}`,
        response.status >= 500
          ? HttpStatus.BAD_GATEWAY
          : (response.status as number),
      );
    }

    return response.json();
  }

  /**
   * Proxy a graph retrieval request to the Python worker's
   * GET /graph-skill/graph/:candidateId endpoint.
   */
  async getGraph(candidateId: string) {
    const response = await fetch(
      `${this.workerUrl}/graph-skill/graph/${encodeURIComponent(candidateId)}`,
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => 'Unknown error');
      throw new HttpException(
        `Graph retrieval failed: ${detail}`,
        response.status === 404
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_GATEWAY,
      );
    }

    return response.json();
  }

  /**
   * Proxy a health check to the Python worker's
   * GET /graph-skill/health endpoint.
   */
  async health() {
    const response = await fetch(`${this.workerUrl}/graph-skill/health`);

    if (!response.ok) {
      return { status: 'error', detail: 'Worker unreachable' };
    }

    return response.json();
  }
}
