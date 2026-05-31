import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobDto {
  @ApiPropertyOptional({ example: 'Senior Frontend Engineer' })
  title?: string;

  @ApiPropertyOptional({ example: 'Remote' })
  location?: string;

  @ApiPropertyOptional({ example: 'full-time' })
  employmentType?: string;

  @ApiPropertyOptional({ example: 'Build the company career platform.' })
  description?: string;

  @ApiPropertyOptional({ example: ['Ship production UI', 'Own design systems'] })
  responsibilities?: string[];

  @ApiPropertyOptional({ example: ['React', 'TypeScript', 'Next.js'] })
  requirements?: string[];

  @ApiPropertyOptional({ example: '$90k - $130k' })
  salaryRange?: string;

  @ApiPropertyOptional({ example: 'published' })
  status?: string;

  @ApiPropertyOptional({ example: true })
  archived?: boolean;
}