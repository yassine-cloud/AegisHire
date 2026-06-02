export class GenerateLetterDto {
  // User information
  userName: string;
  userEmail: string;
  userPhone?: string;
  userLinkedIn?: string;
  userBackground?: string; // Brief background/summary

  // Job information
  jobTitle: string;
  jobDescription: string;
  companyName: string;
  companyIndustry?: string;

  // User input
  draftContent: string; // User's initial draft/notes
  applicationType: 'email' | 'motivation-letter' | 'both'; // What to generate
  tone?: 'formal' | 'professional' | 'friendly'; // Tone preference
}
