import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { GraphSkillService } from './graph-skill.service';
import { RebuildGraphDto } from './dto/rebuild-graph.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@ApiTags('graph-skill')
@Controller('graph-skill')
export class GraphSkillController {
  constructor(private readonly service: GraphSkillService) {}

  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('supabase-bearer')
  @ApiOperation({ summary: 'Rebuild the skill graph for a candidate' })
  @Post('rebuild')
  rebuild(@Body() dto: RebuildGraphDto) {
    return this.service.rebuild(dto);
  }

  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('supabase-bearer')
  @ApiOperation({ summary: 'Get the skill graph for a candidate' })
  @ApiParam({ name: 'candidateId', description: 'The candidate UUID' })
  @Get('graph/:candidateId')
  getGraph(@Param('candidateId') candidateId: string) {
    return this.service.getGraph(candidateId);
  }

  @ApiOperation({ summary: 'Health check for the graph-skill worker' })
  @Get('health')
  health() {
    return this.service.health();
  }
}
