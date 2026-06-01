import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'GitHub username linked to the profile',
    example: 'octocat',
  })
  githubUsername?: string;

  @ApiPropertyOptional({
    description: 'Public URL to the candidate resume',
    example: 'https://cdn.example.com/resumes/octocat.pdf',
  })
  resumeFileUrl?: string;

  @ApiPropertyOptional({
    description: 'List of skills formatted as a JSON object of arrays',
    example: { Languages: ['Python', 'JavaScript'] },
  })
  skills?: Record<string, string[]>;
}
