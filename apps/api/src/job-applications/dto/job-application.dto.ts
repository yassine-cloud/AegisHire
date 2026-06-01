export class CreateJobApplicationDto {
  jobId: string;
  generatedEmail?: string;
  generatedLetter?: string;
  customNotes?: string;
}

export class UpdateJobApplicationDto {
  status?: string;
  generatedEmail?: string;
  generatedLetter?: string;
  customNotes?: string;
}
