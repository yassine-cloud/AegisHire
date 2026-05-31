import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RebuildGraphDto {
  @ApiProperty({ description: 'Unique candidate identifier' })
  candidateId: string;

  @ApiProperty({ description: 'Full name of the candidate' })
  candidateName: string;

  @ApiPropertyOptional({
    description: 'Parsed CV data (skills, experience, etc.)',
    example: {
      skills: { Frameworks: ['React', 'Node.js'], Tools: ['Docker', 'Git'] },
      experience: [{ company: 'Acme', role: 'Engineer' }],
    },
  })
  cvData?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'GitHub analysis data or object containing github_username to trigger analysis',
    example: {
      languages: { TypeScript: 72, Python: 28 },
      skill_signals: [
        { skill: 'Node.js', confidence: 0.88, evidence: ['package.json'] },
      ],
      commit_consistency_score: 0.72,
      architecture_signals: ['REST API'],
    },
  })
  githubData?: Record<string, any>;
}
