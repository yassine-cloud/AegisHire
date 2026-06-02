import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SupabaseJwtPayload } from '../auth/supabase-jwt.service';
import { AtsService } from './ats.service';
import { UpdateStageDto } from './dto/update-stage.dto';

@Controller('ats')
@UseGuards(SupabaseAuthGuard)
export class AtsController {
  constructor(private readonly atsService: AtsService) {}

  @Get('candidates')
  getCandidates(@CurrentUser() user: SupabaseJwtPayload) {
    return this.atsService.getCandidates(user.id);
  }

  @Patch(':candidateId/stage')
  updateStage(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.atsService.updateStage(candidateId, dto);
  }

  @Get(':candidateId/audit')
  getAudit(@Param('candidateId', ParseUUIDPipe) candidateId: string) {
    return this.atsService.getAuditLog(candidateId);
  }
}
