import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GenerateLetterDto } from './dto/generate-letter.dto';
import { GenerateLetterResponseDto } from './dto/generate-letter-response.dto';

@Injectable()
export class AIGenerationService {
  private readonly logger = new Logger(AIGenerationService.name);
  private readonly groqApiKey: string;
  private readonly groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(private configService: ConfigService) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!this.groqApiKey) {
      this.logger.warn('GROQ_API_KEY is not configured');
    }
  }

  async generateLetters(dto: GenerateLetterDto): Promise<GenerateLetterResponseDto> {
    if (!this.groqApiKey) {
      throw new BadRequestException('GROQ API key is not configured');
    }

    const result: GenerateLetterResponseDto = {};

    // Generate email if requested
    if (dto.applicationType === 'email' || dto.applicationType === 'both') {
      result.email = await this.generateEmail(dto);
    }

    // Generate motivation letter if requested
    if (dto.applicationType === 'motivation-letter' || dto.applicationType === 'both') {
      result.motivationLetter = await this.generateMotivationLetter(dto);
    }

    return result;
  }

  private async generateEmail(dto: GenerateLetterDto): Promise<string> {
    const prompt = this.buildEmailPrompt(dto);
    return this.callGroqAPI(prompt, 'email');
  }

  private async generateMotivationLetter(dto: GenerateLetterDto): Promise<string> {
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

  private async callGroqAPI(prompt: string, type: 'email' | 'motivation-letter'): Promise<string> {
    try {
      const response = await axios.post(
        this.groqApiUrl,
        {
          model: 'mixtral-8x7b-32768', // or another available GROQ model
          messages: [
            {
              role: 'system',
              content: 'You are a professional writing assistant specializing in job applications. Provide high-quality, compelling content.',
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

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new BadRequestException('No response from GROQ API');
      }

      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error('Error calling GROQ API', error);
      if (axios.isAxiosError(error)) {
        throw new BadRequestException(
          `GROQ API Error: ${error.response?.data?.error?.message || error.message}`,
        );
      }
      throw error;
    }
  }
}
