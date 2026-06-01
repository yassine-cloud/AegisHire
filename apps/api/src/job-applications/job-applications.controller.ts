import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JobApplication } from '@aegishire/db';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SupabaseJwtPayload } from '../auth/supabase-jwt.service';
import { JobApplicationsService } from './job-applications.service';
import { CreateJobApplicationDto, UpdateJobApplicationDto } from './dto/job-application.dto';

@ApiTags('Job Applications')
@ApiBearerAuth('supabase-bearer')
@Controller('job-applications')
@UseGuards(SupabaseAuthGuard, EmailVerifiedGuard)
export class JobApplicationsController {
  constructor(private readonly jobApplicationsService: JobApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a job application' })
  @ApiCreatedResponse({ description: 'Application created successfully' })
  async createApplication(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() dto: CreateJobApplicationDto,
  ): Promise<JobApplication> {
    return this.jobApplicationsService.createApplication(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all applications for current user' })
  @ApiOkResponse({ description: 'Returns user applications' })
  async getUserApplications(@CurrentUser() user: SupabaseJwtPayload): Promise<JobApplication[]> {
    return this.jobApplicationsService.getUserApplications(user.id);
  }

  @Get(':applicationId')
  @ApiOperation({ summary: 'Get application details' })
  @ApiOkResponse({ description: 'Returns application with related job and company data' })
  async getApplication(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param('applicationId') applicationId: string,
  ): Promise<any> {
    return this.jobApplicationsService.getApplicationWithJob(applicationId, user.id);
  }

  @Patch(':applicationId')
  @ApiOperation({ summary: 'Update job application' })
  @ApiOkResponse({ description: 'Application updated successfully' })
  async updateApplication(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateJobApplicationDto,
  ): Promise<JobApplication> {
    return this.jobApplicationsService.updateApplication(applicationId, user.id, dto);
  }

  @Delete(':applicationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete/archive application' })
  async deleteApplication(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param('applicationId') applicationId: string,
  ): Promise<void> {
    return this.jobApplicationsService.deleteApplication(applicationId, user.id);
  }

  @Get('job/:jobId/check')
  @ApiOperation({ summary: 'Check if user already applied to a job' })
  @ApiOkResponse({ description: 'Returns whether user has applied' })
  async checkIfApplied(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param('jobId') jobId: string,
  ): Promise<{ applied: boolean }> {
    const applied = await this.jobApplicationsService.checkIfApplied(jobId, user.id);
    return { applied };
  }
}
