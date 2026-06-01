import { Company as PrismaCompany } from '@aegishire/db';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Company implements PrismaCompany {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  ownerUserId: string;

  @ApiProperty({ example: 'Acme Tech' })
  name: string;

  @ApiPropertyOptional({ example: 'Technology' })
  industry: string | null;

  @ApiPropertyOptional({ example: '51-200' })
  size: string | null;

  @ApiPropertyOptional({ example: ['Ownership', 'Transparency'] })
  values: any | null;

  @ApiPropertyOptional({ example: 'https://acme.example.com' })
  websiteUrl: string | null;

  @ApiPropertyOptional({ example: 'We build hiring tools for modern teams.' })
  description: string | null;

  @ApiPropertyOptional({ example: 'talent@acme.example.com' })
  contactEmail: string | null;

  @ApiPropertyOptional()
  archivedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}