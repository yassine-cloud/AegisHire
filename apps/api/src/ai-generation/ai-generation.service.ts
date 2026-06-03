import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GenerateLetterDto } from './dto/generate-letter.dto';
import { GenerateLetterResponseDto } from './dto/generate-letter-response.dto';

interface GroqChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface GroqErrorResponse {
  error?: {
    message?: string;
  };
}

@Injectable()
export class AIGenerationService {
  private readonly logger = new Logger(AIGenerationService.name);
  private readonly groqApiKey: string | undefined;
  private readonly groqModel: string;
  private readonly groqApiUrl =
    'https://api.groq.com/openai/v1/chat/completions';

  constructor(private configService: ConfigService) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY');
    this.groqModel =
      this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';
    if (!this.groqApiKey) {
      this.logger.warn('GROQ_API_KEY is not configured');
    }
  }

  async generateLetters(
    dto: GenerateLetterDto,
  ): Promise<GenerateLetterResponseDto> {
    if (!this.groqApiKey) {
      throw new BadRequestException('GROQ API key is not configured');
    }

    const result: GenerateLetterResponseDto = {};

    // Generate email if requested
    if (dto.applicationType === 'email' || dto.applicationType === 'both') {
      result.email = await this.generateEmail(dto);
    }

    // Generate motivation letter if requested
    if (
      dto.applicationType === 'motivation-letter' ||
      dto.applicationType === 'both'
    ) {
      result.motivationLetter = await this.generateMotivationLetter(dto);
    }

    return result;
  }

  async evaluateApplication(
    jobDescription: string,
    candidateSkills: string[],
  ): Promise<{ matchScore: number; resumeSummary: string }> {
    const localScore = this.calculateLocalMatchScore(jobDescription, candidateSkills);
    const localSummary = this.generateLocalResumeSummary(candidateSkills);

    if (!this.groqApiKey) {
      this.logger.warn('GROQ API key not configured, using local evaluation');
      return { matchScore: localScore, resumeSummary: localSummary };
    }

    const prompt = `You are an expert ATS (Applicant Tracking System) AI evaluator.
Your task is to evaluate a candidate's fit for a job.
You will be provided with the Job Description and the Candidate's parsed skills.

Job Description:
${jobDescription}

Candidate Skills:
${candidateSkills.join(', ')}

Please provide:
1. A 'matchScore' from 0 to 100 representing how well the candidate's skills match the job description.
2. A 'resumeSummary' (2-3 sentences) summarizing the candidate's profile in the context of the job, highlighting strengths and missing key skills.

Output exactly a valid JSON object with the keys "matchScore" (integer) and "resumeSummary" (string), and nothing else.`;

    try {
      const resultStr = await this.callGroqAPI(prompt, 'evaluation');
      
      // Attempt to extract JSON from the string, in case it returns markdown \`\`\`json ... \`\`\`
      const jsonStr = resultStr.replace(/\`\`\`json\n?|\n?\`\`\`/g, '').trim();
      const result = JSON.parse(jsonStr);
      const aiScore = typeof result.matchScore === 'number' ? result.matchScore : localScore;
      const aiSummary = typeof result.resumeSummary === 'string' ? result.resumeSummary : localSummary;
      return { matchScore: aiScore, resumeSummary: aiSummary };
    } catch (e) {
      this.logger.error('Failed to parse AI evaluation, using local evaluation', e);
      return { matchScore: localScore, resumeSummary: localSummary };
    }
  }

  private skillMatchesDescription(skill: string, desc: string): boolean {
    const s = skill.toLowerCase().trim();
    if (!s || s.length < 2) return false;

    if (desc.includes(s)) return true;

    const normalized = s.replace(/[-._/\\]/g, '');
    if (normalized !== s && desc.includes(normalized)) return true;

    const words = s.split(/[-._/\\\s]+/).filter((w) => w.length > 1);
    if (words.length > 1) {
      const matchedWords = words.filter((w) => desc.includes(w));
      if (matchedWords.length >= Math.ceil(words.length / 2)) return true;
    }

    return false;
  }

  private calculateLocalMatchScore(jobDescription: string, candidateSkills: string[]): number {
    if (!candidateSkills || candidateSkills.length === 0) return 0;

    const descLower = jobDescription.toLowerCase();
    const matched = candidateSkills.filter((skill) =>
      this.skillMatchesDescription(skill, descLower),
    );

    return Math.round((matched.length / candidateSkills.length) * 100);
  }

  private generateLocalResumeSummary(candidateSkills: string[]): string {
    if (!candidateSkills || candidateSkills.length === 0) {
      return 'No skills data available for this candidate.';
    }
    return `The candidate has skills in ${candidateSkills.join(', ')}.`;
  }

  private async generateEmail(dto: GenerateLetterDto): Promise<string> {
    const prompt = this.buildEmailPrompt(dto);
    return this.callGroqAPI(prompt, 'email');
  }

  private async generateMotivationLetter(
    dto: GenerateLetterDto,
  ): Promise<string> {
    const prompt = this.buildMotivationLetterPrompt(dto);
    return this.callGroqAPI(prompt, 'motivation-letter');
  }

  private buildEmailPrompt(dto: GenerateLetterDto): string {
    const tone = dto.tone || 'professional';
    return `You are a professional email writing assistant. Based on the following information, generate a compelling and professional email application.

User Information:
- Name: ${dto.userName}
- Email: ${dto.userEmail}
${dto.userPhone ? `- Phone: ${dto.userPhone}` : ''}
${dto.userLinkedIn ? `- LinkedIn: ${dto.userLinkedIn}` : ''}
${dto.userBackground ? `- Background: ${dto.userBackground}` : ''}

Job Information:
- Position: ${dto.jobTitle}
- Company: ${dto.companyName}
${dto.companyIndustry ? `- Industry: ${dto.companyIndustry}` : ''}

Job Description:
${dto.jobDescription}

User's Draft/Notes:
${dto.draftContent}

Requirements:
1. Write a professional email body (without subject line)
2. Tone: ${tone}
3. Length: 150-250 words
4. Start with a clear subject line in the format: Subject: [subject line]
5. Make it compelling and highlight relevant skills/experience
6. Reference specific points from the job description
7. End with a professional closing

Generate the email:`;
  }

  private buildMotivationLetterPrompt(dto: GenerateLetterDto): string {
    const tone = dto.tone || 'professional';
    return `You are a professional motivation letter writing assistant. Based on the following information, generate a compelling and professional motivation letter.

User Information:
- Name: ${dto.userName}
- Email: ${dto.userEmail}
${dto.userPhone ? `- Phone: ${dto.userPhone}` : ''}
${dto.userLinkedIn ? `- LinkedIn: ${dto.userLinkedIn}` : ''}
${dto.userBackground ? `- Background: ${dto.userBackground}` : ''}

Job Information:
- Position: ${dto.jobTitle}
- Company: ${dto.companyName}
${dto.companyIndustry ? `- Industry: ${dto.companyIndustry}` : ''}

Job Description:
${dto.jobDescription}

User's Draft/Notes:
${dto.draftContent}

Requirements:
1. Write a professional motivation letter (without salutation at the top)
2. Tone: ${tone}
3. Length: 250-400 words
4. Structure: Introduction, Body (2-3 paragraphs), Closing
5. Highlight relevant skills and experience that match the job requirements
6. Show genuine interest in the company and role
7. Address specific points from the job description
8. End with a professional closing and signature line

Generate the motivation letter:`;
  }

  private async callGroqAPI(
    prompt: string,
    type: 'email' | 'motivation-letter' | 'evaluation',
  ): Promise<string> {
    try {
      const response = await axios.post<GroqChatCompletionResponse>(
        this.groqApiUrl,
        {
          model: this.groqModel,
          messages: [
            {
              role: 'system',
              content:
                'You are a professional writing assistant specializing in job applications. Provide high-quality, compelling content.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: type === 'email' ? 1000 : 1500,
          top_p: 0.9,
        },
        {
          headers: {
            Authorization: `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const generatedContent = response.data.choices?.[0]?.message?.content;

      if (!generatedContent) {
        throw new BadRequestException('No response from GROQ API');
      }

      return generatedContent;
    } catch (error) {
      this.logger.error('Error calling GROQ API', error);
      if (axios.isAxiosError<GroqErrorResponse>(error)) {
        throw new BadRequestException(
          `GROQ API Error: ${error.response?.data?.error?.message || error.message}`,
        );
      }
      throw error;
    }
  }
}
