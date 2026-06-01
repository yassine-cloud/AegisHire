import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@aegishire/db';

export class UpdateAdminAccountDto {
  @ApiPropertyOptional({ example: 'Acme Admin' })
  displayName?: string;

  @ApiPropertyOptional({ enum: AccountType, example: AccountType.developer })
  accountType?: AccountType;

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

  @ApiPropertyOptional({ example: true })
  archived?: boolean;
}