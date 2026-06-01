import { Body, Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AIGenerationService } from './ai-generation.service';
import { GenerateLetterDto } from './dto/generate-letter.dto';
import { GenerateLetterResponseDto } from './dto/generate-letter-response.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SupabaseJwtPayload } from '../auth/supabase-jwt.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiCreatedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

@ApiTags('AI Generation')
@ApiBearerAuth('supabase-bearer')
@Controller('ai-generation')
@UseGuards(SupabaseAuthGuard)
export class AIGenerationController {
  constructor(private readonly aiGenerationService: AIGenerationService) {}

  @Post('generate-application')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate email and/or motivation letter using GROQ AI',
    description:
      'Uses GROQ AI to generate professional emails and motivation letters based on user draft and job information',
  })
  @ApiCreatedResponse({
    description: 'Successfully generated email/motivation letter',
    type: GenerateLetterResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or API error',
  })
  async generateApplication(
    @Body() generateLetterDto: GenerateLetterDto,
    @CurrentUser() user: SupabaseJwtPayload,
  ): Promise<GenerateLetterResponseDto> {
    return this.aiGenerationService.generateLetters(generateLetterDto);
  }
}
