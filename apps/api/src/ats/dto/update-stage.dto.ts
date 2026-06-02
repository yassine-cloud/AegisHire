import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '@aegishire/db';

export class UpdateStageDto {
  @ApiProperty({ example: 'uuid-of-job' })
  jobId!: string;

  @ApiProperty({ enum: ApplicationStatus, example: ApplicationStatus.REVIEW })
  newStatus!: ApplicationStatus;
}
