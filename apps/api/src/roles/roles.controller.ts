import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SupabaseJwtPayload } from '../auth/supabase-jwt.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { GapReportResponseDto } from './dto/gap-report.dto';
import { TestSetupRequestDto } from './dto/test-setup-request.dto';
import { TestSetupResponseDto } from './dto/test-setup.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth('supabase-bearer')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Seed a test role + role-match for local gap-report testing.
   * Declared before parameterized routes so the static path is not captured as a slug.
   * ⚠️ For development/testing only.
   */
  @Post('test-setup')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Seed test role and role-match for gap-report testing (dev only)' })
  @ApiResponse({ status: 201, type: TestSetupResponseDto })
  async seedTestData(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() payload: TestSetupRequestDto,
  ): Promise<TestSetupResponseDto> {
    return this.rolesService.seedTestData(user.id, payload);
  }

  /**
   * Get a gap report for the authenticated candidate and role slug.
   */
  @Get(':id/gap-report')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Get gap report for a role' })
  @ApiParam({ name: 'id', description: 'Role slug, e.g. senior-backend-engineer' })
  @ApiResponse({ status: 200, type: GapReportResponseDto })
  @ApiResponse({ status: 400, description: 'NO_GAPS_ABOVE_THRESHOLD | PROFILE_INCOMPLETE' })
  @ApiResponse({ status: 404, description: 'ROLE_NOT_FOUND' })
  @ApiResponse({ status: 503, description: 'WORKER_UNAVAILABLE' })
  async getGapReport(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param('id') roleId: string,
  ): Promise<GapReportResponseDto> {
    return this.rolesService.getGapReport(user.id, roleId);
  }
}
