import { Body, Controller, Delete, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';
import { ProfilesService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { Profile } from '@aegishire/db';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SupabaseJwtPayload } from '../auth/supabase-jwt.service';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Profile')
@ApiBearerAuth('supabase-bearer')
@Controller('profile')
@UseGuards(SupabaseAuthGuard, EmailVerifiedGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'Returns the current authenticated user profile if it exists' })
  @Get('me')
  findMe(@CurrentUser() user: SupabaseJwtPayload): Promise<Profile | null> {
    return this.profilesService.getProfile(user.id);
  }

  @ApiOperation({ summary: 'Create or update current user profile' })
  @ApiOkResponse({ description: 'Upserts profile data for the current authenticated user' })
  @Patch('me')
  updateMe(@CurrentUser() user: SupabaseJwtPayload, @Body() updateProfileDto: UpdateProfileDto): Promise<Profile> {
    return this.profilesService.updateProfile(user.id, updateProfileDto);
  }

  @ApiOperation({ summary: 'Delete current user profile' })
  @ApiNoContentResponse({ description: 'Profile deleted (or no profile existed)' })
  @Delete('me')
  @HttpCode(204)
  async deleteMe(@CurrentUser() user: SupabaseJwtPayload): Promise<void> {
    await this.profilesService.deleteProfile(user.id);
  }
}
