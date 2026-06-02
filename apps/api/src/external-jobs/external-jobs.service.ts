import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  CompareExternalJobDto,
  ExplainExternalJobDto,
  GapReportExternalJobDto,
  ParsedExternalJobDto,
  ParseExternalJobDto,
} from './dto/external-job.dto';

type WorkerComparison = {
  compatibility_score: number;
  matched_skills: unknown[];
  missing_skills: unknown[];
};

@Injectable()
export class ExternalJobsService {
  private readonly logger = new Logger(ExternalJobsService.name);
  private readonly workerBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
  ) {
    this.workerBaseUrl =
      configService.get<string>('WORKER_BASE_URL') ?? 'http://127.0.0.1:8000';
  }

  async parse(payload: ParseExternalJobDto): Promise<ParsedExternalJobDto> {
    const companyName = payload.companyName?.trim();
    const jobDescription = payload.jobDescription?.trim();

    if (!companyName || companyName.length < 2) {
      throw new BadRequestException(
        this.errorEnvelope(
          HttpStatus.BAD_REQUEST,
          'INVALID_COMPANY_NAME',
          'Company name must be at least 2 characters.',
        ),
      );
    }

    if (!jobDescription || jobDescription.length < 80) {
      throw new BadRequestException(
        this.errorEnvelope(
          HttpStatus.BAD_REQUEST,
          'INVALID_JOB_DESCRIPTION',
          'Job description must be at least 80 characters.',
        ),
      );
    }

    return this.postWorker<ParsedExternalJobDto>('/worker/parse-external-job', {
      companyName,
      jobDescription,
    });
  }

  async compare(
    candidateId: string,
    payload: CompareExternalJobDto,
  ): Promise<WorkerComparison> {
    const job = this.requireJob(payload.job);

    return this.postWorker<WorkerComparison>('/worker/compare-role', {
      candidate_id: candidateId,
      role_id: 'external-job',
      required_skills: job.requiredSkills ?? [],
      preferred_skills: job.preferredSkills ?? [],
    });
  }

  async explain(payload: ExplainExternalJobDto): Promise<unknown> {
    const roleTitle = payload.roleTitle?.trim();
    if (!roleTitle) {
      throw new BadRequestException(
        this.errorEnvelope(
          HttpStatus.BAD_REQUEST,
          'INVALID_ROLE_TITLE',
          'Role title is required.',
        ),
      );
    }

    return this.postWorker<unknown>('/worker/explain-match-score', {
      role_title: roleTitle,
      compatibility_score: Number(payload.compatibilityScore) || 0,
      matched_skills: Array.isArray(payload.matchedSkills)
        ? payload.matchedSkills
        : [],
      missing_skills: Array.isArray(payload.missingSkills)
        ? payload.missingSkills
        : [],
    });
  }

  async gapReport(
    candidateId: string,
    payload: GapReportExternalJobDto,
  ): Promise<unknown> {
    const roleTitle = payload.roleTitle?.trim();
    if (!roleTitle) {
      throw new BadRequestException(
        this.errorEnvelope(
          HttpStatus.BAD_REQUEST,
          'INVALID_ROLE_TITLE',
          'Role title is required.',
        ),
      );
    }

    return this.postWorker<unknown>('/worker/generate-report/direct', {
      candidate_id: candidateId,
      role_id: 'external-job',
      role_title: roleTitle,
      missing_skills: this.normalizeMissingSkills(payload.missingSkills),
    });
  }

  private requireJob(value: unknown): ParsedExternalJobDto {
    if (!this.isObject(value)) {
      throw new BadRequestException(
        this.errorEnvelope(
          HttpStatus.BAD_REQUEST,
          'INVALID_JOB',
          'Parsed job payload is required.',
        ),
      );
    }

    const title = typeof value.title === 'string' ? value.title.trim() : '';
    const companyName =
      typeof value.companyName === 'string' ? value.companyName.trim() : '';

    if (!title && !companyName) {
      throw new BadRequestException(
        this.errorEnvelope(
          HttpStatus.BAD_REQUEST,
          'INVALID_JOB',
          'Parsed job must include a title or company name.',
        ),
      );
    }

    return value as unknown as ParsedExternalJobDto;
  }

  private normalizeMissingSkills(
    value: unknown,
  ): { skill: string; importance: string }[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item === 'string') {
          return { skill: item.trim(), importance: 'low' };
        }

        if (!this.isObject(item)) {
          return null;
        }

        const rawSkill = item.skill ?? item.name ?? item.normalized_name;
        const skill = typeof rawSkill === 'string' ? rawSkill.trim() : '';
        const rawImportance = item.importance;
        const importance =
          rawImportance === 'high' ||
          rawImportance === 'medium' ||
          rawImportance === 'low'
            ? rawImportance
            : 'low';

        return skill ? { skill, importance } : null;
      })
      .filter(
        (item): item is { skill: string; importance: string } => item !== null,
      );
  }

  private async postWorker<T>(path: string, body: unknown): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<T>(`${this.workerBaseUrl}${path}`, body, {
          timeout: 45000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Worker request failed: ${this.stringifyError(error)}`);
      throw new ServiceUnavailableException(
        this.errorEnvelope(
          HttpStatus.SERVICE_UNAVAILABLE,
          'WORKER_UNAVAILABLE',
          'External job worker flow is unavailable. Please try again later.',
        ),
      );
    }
  }

  private errorEnvelope(
    statusCode: number,
    error: string,
    message: string,
  ): {
    statusCode: number;
    error: string;
    message: string;
    timestamp: string;
  } {
    return {
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private stringifyError(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
