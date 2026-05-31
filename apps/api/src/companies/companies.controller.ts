import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Company, Job } from '@aegishire/db';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SupabaseJwtPayload } from '../auth/supabase-jwt.service';
import { AdminGuard } from '../auth/admin.guard';
import { CompaniesService } from './companies.service';
import { UpsertCompanyDto } from './dto/upsert-company.dto';
import { CreateCompanyCredentialsDto } from './dto/create-company-credentials.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@ApiTags('Companies')
@ApiBearerAuth('supabase-bearer')
@Controller('companies')
@UseGuards(SupabaseAuthGuard, EmailVerifiedGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @ApiOperation({ summary: 'Get the current company record' })
  @ApiOkResponse({ description: 'Returns the company attached to the authenticated user' })
  @Get('me')
  getMe(@CurrentUser() user: SupabaseJwtPayload): Promise<Company | null> {
    return this.companiesService.getCompany(user.id);
  }

  @ApiOperation({ summary: 'Create or update the current company record' })
  @ApiOkResponse({ description: 'Upserts company data for the authenticated user' })
  @Patch('me')
  updateMe(@CurrentUser() user: SupabaseJwtPayload, @Body() payload: UpsertCompanyDto): Promise<Company> {
    return this.companiesService.upsertMyCompany(user, payload);
  }

  @ApiOperation({ summary: 'List jobs posted by the current company' })
  @ApiOkResponse({ description: 'Returns jobs owned by the authenticated company' })
  @Get('me/jobs')
  listMyJobs(@CurrentUser() user: SupabaseJwtPayload): Promise<Job[]> {
    return this.companiesService.listMyJobs(user.id);
  }

  @ApiOperation({ summary: 'Create a new company job post' })
  @ApiOkResponse({ description: 'Creates a new job associated with the authenticated company' })
  @Post('me/jobs')
  createMyJob(@CurrentUser() user: SupabaseJwtPayload, @Body() payload: CreateJobDto): Promise<Job> {
    return this.companiesService.createMyJob(user.id, payload);
  }

  @ApiOperation({ summary: 'Update a company job post' })
  @ApiOkResponse({ description: 'Updates an existing job owned by the authenticated company' })
  @Patch('me/jobs/:jobId')
  updateMyJob(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param('jobId') jobId: string,
    @Body() payload: UpdateJobDto,
  ): Promise<Job> {
    return this.companiesService.updateMyJob(user.id, jobId, payload);
  }

  @ApiOperation({ summary: 'List all companies for admin review' })
  @ApiOkResponse({ description: 'Returns all registered companies' })
  @Get('admin')
  @UseGuards(AdminGuard)
  listAll(): Promise<Company[]> {
    return this.companiesService.listCompanies();
  }

  @ApiOperation({ summary: 'Create company credentials and provisioning records' })
  @ApiCreatedResponse({ description: 'Creates a Supabase user plus company and profile records' })
  @Post('admin')
  @UseGuards(AdminGuard)
  createCredentials(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() payload: CreateCompanyCredentialsDto,
  ): ReturnType<CompaniesService['createCompanyCredentials']> {
    return this.companiesService.createCompanyCredentials(user, payload);
  }
}