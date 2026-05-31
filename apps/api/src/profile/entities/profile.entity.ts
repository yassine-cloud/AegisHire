import { AccountType, Profile as PrismaProfile } from '@aegishire/db';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Profile implements PrismaProfile {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({ enum: AccountType, example: AccountType.developer })
  accountType: AccountType;

  @ApiPropertyOptional({ example: 'octocat' })
  githubUsername: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/resumes/octocat.pdf' })
  resumeFileUrl: string | null;

  @ApiPropertyOptional({ example: { 'Languages': ['Python', 'JavaScript'] } })
  skills: any | null;

  @ApiPropertyOptional()
  githubAnalyzedAt: Date | null;

  @ApiPropertyOptional()
  resumeParsedAt: Date | null;

  @ApiPropertyOptional()
  graphBuiltAt: Date | null;

  @ApiPropertyOptional()
  archivedAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
