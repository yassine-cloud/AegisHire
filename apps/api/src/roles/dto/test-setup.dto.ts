import { ApiProperty } from '@nestjs/swagger';

export class TestSetupResponseDto {
  @ApiProperty({ example: 'software-engineer' })
  roleSlug!: string;

  @ApiProperty({ example: 'Software Engineer' })
  roleTitle!: string;

  @ApiProperty({ example: 40 })
  compatibilityScore!: number;

  @ApiProperty({
    example: ['TypeScript', 'Docker', 'System Design'],
    type: [String],
  })
  missingSkills!: string[];

  @ApiProperty({ example: 'Role and role-match seeded successfully.' })
  message!: string;
}
