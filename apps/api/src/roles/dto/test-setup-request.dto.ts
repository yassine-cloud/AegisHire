import { ApiPropertyOptional } from '@nestjs/swagger';

export class TestSetupRequestDto {
  @ApiPropertyOptional({
    example: 'software-engineer',
    description: 'Role slug used by the gap-report endpoint.',
  })
  roleSlug?: string;

  @ApiPropertyOptional({
    example: 'Software Engineer',
    description: 'Human-readable role title.',
  })
  roleTitle?: string;

  @ApiPropertyOptional({
    example: 40,
    description: 'Compatibility score persisted in role match (must be below 70 for gap-report testing).',
  })
  compatibilityScore?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['TypeScript', 'Docker', 'System Design'],
    description: 'Missing skills used as the recommendation input payload.',
  })
  missingSkills?: string[];
}
