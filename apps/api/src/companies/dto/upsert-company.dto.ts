import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertCompanyDto {
  @ApiPropertyOptional({ example: 'Acme Tech' })
  name?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  industry?: string;

  @ApiPropertyOptional({ example: '51-200' })
  size?: string;

  @ApiPropertyOptional({ example: ['Ownership', 'Speed', 'Transparency'] })
  values?: string[];

  @ApiPropertyOptional({ example: 'https://acme.example.com' })
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 'We build hiring tools for modern teams.' })
  description?: string;

  @ApiPropertyOptional({ example: 'talent@acme.example.com' })
  contactEmail?: string;
}