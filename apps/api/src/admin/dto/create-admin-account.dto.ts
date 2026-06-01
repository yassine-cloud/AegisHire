import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@aegishire/db';

export class CreateAdminAccountDto {
  @ApiProperty({ example: 'company.admin@example.com' })
  email!: string;

  @ApiProperty({ example: 'Acme Admin' })
  displayName!: string;

  @ApiPropertyOptional({ example: 'TempPass123!' })
  password?: string;

  @ApiProperty({ enum: AccountType, example: AccountType.company })
  accountType!: AccountType;

  @ApiPropertyOptional({ example: 'Acme Tech' })
  companyName?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  industry?: string;

  @ApiPropertyOptional({ example: '51-200' })
  size?: string;

  @ApiPropertyOptional({ example: ['Ownership', 'Transparency'] })
  values?: string[];

  @ApiPropertyOptional({ example: 'https://example.com' })
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 'talent@example.com' })
  contactEmail?: string;
}