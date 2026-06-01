import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SupabaseJwtPayload } from '../auth/supabase-jwt.service';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';
import { CompaniesController } from '../companies/companies.controller';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@ApiTags('Admin')
@ApiBearerAuth('supabase-bearer')
@Controller('admin/accounts')
@UseGuards(SupabaseAuthGuard, EmailVerifiedGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'List all portal accounts' })
  @ApiOkResponse({ description: 'Returns all user profiles with company information' })
  @Get()
  list(): ReturnType<AdminService['listAccounts']> {
    return this.adminService.listAccounts();
  }

  @ApiOperation({ summary: 'Create a new portal account' })
  @ApiOkResponse({ description: 'Creates a developer, company, or admin account' })
  @Post()
  create(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() payload: CreateAdminAccountDto,
  ): ReturnType<AdminService['createAccount']> {
    return this.adminService.createAccount(user, payload);
  }

  @ApiOperation({ summary: 'Update an existing portal account' })
  @ApiOkResponse({ description: 'Updates account type, archive state, and company data' })
  @Patch(':userId')
  update(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param('userId') userId: string,
    @Body() payload: UpdateAdminAccountDto,
  ): ReturnType<AdminService['updateAccount']> {
    return this.adminService.updateAccount(user, userId, payload);
  }

  @ApiOperation({ summary: 'Archive or restore an account' })
  @ApiOkResponse({ description: 'Marks an account archived or active' })
  @Patch(':userId/archive')
  archive(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param('userId') userId: string,
    @Body() body: { archived: boolean },
  ): ReturnType<AdminService['archiveAccount']> {
    return this.adminService.archiveAccount(user, userId, body.archived);
  }
}