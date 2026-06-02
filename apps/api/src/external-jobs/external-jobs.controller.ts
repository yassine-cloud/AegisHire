import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SupabaseJwtPayload } from '../auth/supabase-jwt.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import {
  CompareExternalJobDto,
  ExplainExternalJobDto,
  GapReportExternalJobDto,
  ParsedExternalJobDto,
  ParseExternalJobDto,
} from './dto/external-job.dto';
import { ExternalJobsService } from './external-jobs.service';

@ApiTags('external-jobs')
@ApiBearerAuth('supabase-bearer')
@Controller('external-jobs')
@UseGuards(SupabaseAuthGuard)
export class ExternalJobsController {
  constructor(private readonly externalJobsService: ExternalJobsService) {}

  @Post('parse')
  @ApiOperation({
    summary: 'Parse an external job description into structured data',
  })
  @ApiResponse({ status: 201, type: ParsedExternalJobDto })
  parse(@Body() payload: ParseExternalJobDto): Promise<ParsedExternalJobDto> {
    return this.externalJobsService.parse(payload);
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare candidate against a parsed external job' })
  compare(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() payload: CompareExternalJobDto,
  ) {
    return this.externalJobsService.compare(user.id, payload);
  }

  @Post('explain')
  @ApiOperation({ summary: 'Explain an external job match result' })
  explain(@Body() payload: ExplainExternalJobDto) {
    return this.externalJobsService.explain(payload);
  }

  @Post('gap-report')
  @ApiOperation({
    summary: 'Generate a gap report for a parsed external job match',
  })
  gapReport(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() payload: GapReportExternalJobDto,
  ) {
    return this.externalJobsService.gapReport(user.id, payload);
  }
}
