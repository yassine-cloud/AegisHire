import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ParsedExternalJobDto {
  @ApiProperty({ example: 'Senior Frontend Engineer' })
  title!: string;

  @ApiProperty({ example: 'Acme' })
  companyName!: string;

  @ApiPropertyOptional({ example: 'Remote' })
  location?: string | null;

  @ApiPropertyOptional({ example: 'full-time' })
  employmentType?: string | null;

  @ApiProperty({ example: 'Build customer-facing product experiences.' })
  description!: string;

  @ApiProperty({ type: [String] })
  responsibilities!: string[];

  @ApiProperty({ type: [String] })
  requirements!: string[];

  @ApiProperty({ type: [String] })
  requiredSkills!: string[];

  @ApiProperty({ type: [String] })
  preferredSkills!: string[];

  @ApiPropertyOptional({ example: 4 })
  experienceYears?: number | null;

  @ApiPropertyOptional({ example: 'senior' })
  seniority?: string | null;

  @ApiProperty({
    example: 'A senior UI engineering role focused on product delivery.',
  })
  summary!: string;
}

export class ParseExternalJobDto {
  @ApiProperty({ example: 'Acme' })
  companyName!: string;

  @ApiProperty({ example: 'Senior Frontend Engineer...' })
  jobDescription!: string;
}

export class CompareExternalJobDto {
  @ApiProperty({ type: () => ParsedExternalJobDto })
  job!: ParsedExternalJobDto;
}

export class ExplainExternalJobDto {
  @ApiProperty({ example: 'Senior Frontend Engineer' })
  roleTitle!: string;

  @ApiProperty({ example: 64 })
  compatibilityScore!: number;

  @ApiProperty({ type: [Object] })
  matchedSkills!: unknown[];

  @ApiProperty({ type: [Object] })
  missingSkills!: unknown[];
}

export class GapReportExternalJobDto {
  @ApiProperty({ example: 'Senior Frontend Engineer' })
  roleTitle!: string;

  @ApiProperty({ type: [Object] })
  missingSkills!: unknown[];
}
