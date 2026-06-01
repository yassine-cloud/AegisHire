import { ApiProperty } from '@nestjs/swagger';
import { UpsertCompanyDto } from './upsert-company.dto';

export class CreateCompanyCredentialsDto extends UpsertCompanyDto {
  @ApiProperty({ example: 'Acme Tech' })
  declare name: string;

  @ApiProperty({ example: 'company.admin@acme.example.com' })
  email!: string;

  @ApiProperty({ example: 'TempPass123!' })
  password?: string;
}