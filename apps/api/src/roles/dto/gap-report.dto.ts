import { ApiProperty } from '@nestjs/swagger';

export class GapEntryDto {
  @ApiProperty({ example: 'Kubernetes' })
  skill!: string;

  @ApiProperty({ example: 'high', enum: ['high', 'medium', 'low'] })
  importance!: 'high' | 'medium' | 'low';

  @ApiProperty({ example: 'none', enum: ['none', 'beginner', 'intermediate'] })
  current_level!: 'none' | 'beginner' | 'intermediate';

  @ApiProperty({
    example: 'Deploy one project on Minikube using Deployments and Services.',
  })
  recommendation!: string;

  @ApiProperty({ example: '3-4 weeks' })
  estimated_effort!: string;
}

export class GapReportResponseDto {
  @ApiProperty({ example: 'senior-backend-engineer' })
  role_id!: string;

  @ApiProperty({ example: 67 })
  compatibility_score!: number;

  @ApiProperty({ type: () => [GapEntryDto] })
  gaps!: GapEntryDto[];

  @ApiProperty({
    example: ['Kubernetes', 'System Design', 'Testing Coverage'],
    type: [String],
  })
  overall_priority_order!: string[];
}
