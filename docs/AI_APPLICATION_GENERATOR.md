# AI Application Letter Generator

## Overview

The AI Application Letter Generator is a feature that uses the GROQ API to help job applicants craft professional emails and motivation letters. Users provide their background, job information, and a draft of their ideas, and the GROQ AI generates polished, compelling application materials.

## Features

- **Email Generation**: Creates professional job application emails
- **Motivation Letter Generation**: Generates compelling motivation/cover letters
- **Flexible Tones**: Support for formal, professional, and friendly tones
- **Combined Generation**: Generate both email and motivation letter in one request
- **User-Friendly Interface**: React component with form validation and copy-to-clipboard functionality

## Architecture

### Backend (NestJS)

**Location**: `apps/api/src/ai-generation/`

#### Files:
- `ai-generation.service.ts` - Core service handling GROQ API integration
- `ai-generation.controller.ts` - API endpoint for generation requests
- `ai-generation.module.ts` - NestJS module definition
- `dto/generate-letter.dto.ts` - Input data structure
- `dto/generate-letter-response.dto.ts` - Response data structure

#### Key Service Methods:
- `generateLetters(dto)` - Main method to generate content
- `generateEmail(dto)` - Generates email body
- `generateMotivationLetter(dto)` - Generates motivation letter
- `callGroqAPI(prompt, type)` - Handles GROQ API communication

### Frontend (Next.js/React)

**Location**: `apps/frontend/src/components/GenerateLetterForm.tsx`

**Page Location**: `apps/frontend/src/app/(protected)/ai-application/page.tsx`

#### Features:
- Multi-step form with user and job information sections
- Real-time form state management
- Copy-to-clipboard functionality for generated content
- Error handling and loading states
- Dark mode support

## API Endpoint

### POST `/ai-generation/generate-application`

**Authentication**: Required (Supabase JWT Bearer Token)

**Request Body**:
```typescript
{
  // User Information
  userName: string;                    // Required
  userEmail: string;                  // Required
  userPhone?: string;                 // Optional
  userLinkedIn?: string;              // Optional
  userBackground?: string;            // Optional

  // Job Information
  jobTitle: string;                   // Required
  jobDescription: string;             // Required
  companyName: string;                // Required
  companyIndustry?: string;           // Optional

  // Generation Settings
  draftContent: string;               // Required - User's draft/notes
  applicationType: 'email' | 'motivation-letter' | 'both'; // What to generate
  tone?: 'formal' | 'professional' | 'friendly'; // Default: 'professional'
}
```

**Response**:
```typescript
{
  email?: string;              // Generated email body (if requested)
  motivationLetter?: string;   // Generated motivation letter (if requested)
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3001/ai-generation/generate-application \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "jobTitle": "Senior Developer",
    "jobDescription": "...",
    "companyName": "TechCorp",
    "draftContent": "I am interested in this role...",
    "applicationType": "both",
    "tone": "professional"
  }'
```

## Configuration

### Environment Variables

Add to `apps/api/.env`:
```env
GROQ_API_KEY=gsk_your_api_key_here
```

The GROQ API key is provided in the `.env` file and uses the `mixtral-8x7b-32768` model by default.

## Usage Guide

### For Users

1. Navigate to `/ai-application` in the frontend
2. Fill in your information:
   - Name, email, phone, LinkedIn, background
3. Provide job details:
   - Job title, company name, job description
4. Write your draft/notes with key points you want to highlight
5. Select generation options:
   - What to generate (email, letter, or both)
   - Preferred tone
6. Click "Generate Application Letters"
7. Copy the generated content to use in your application

### For Developers

#### Setting Up Locally

1. Ensure GROQ_API_KEY is set in `.env`
2. Start the API: `pnpm --filter api dev`
3. Start the frontend: `pnpm --filter frontend dev`
4. Visit `http://localhost:3000/ai-application`

#### Testing the API

Use the HTTP test file: `apps/api/http/ai-generation.http`

Test cases included:
- Generate both email and motivation letter
- Generate only email
- Generate only motivation letter

#### Integration with User Dashboard

The component can be integrated into the main dashboard:

```tsx
import { GenerateLetterForm } from '@/components/GenerateLetterForm';

export function ApplicationHelperWidget() {
  return (
    <div>
      <h2>Need help with your application?</h2>
      <GenerateLetterForm 
        onSuccess={(content) => {
          console.log('Generated:', content);
        }}
      />
    </div>
  );
}
```

## Prompt Engineering

### Email Prompt Structure
- Includes user and job information
- Specifies tone and length requirements
- Requests subject line format
- Emphasizes relevance to job description

### Motivation Letter Prompt Structure
- Guides structure (introduction, body, closing)
- Emphasizes authenticity and interest
- Specifies length requirements
- Highlights specific skill matching

## GROQ API Details

- **Model**: `mixtral-8x7b-32768`
- **Temperature**: 0.7 (balanced creativity and coherence)
- **Max Tokens**: 1000 for email, 1500 for motivation letter
- **Top P**: 0.9 (nucleus sampling)

## Error Handling

- **Missing GROQ_API_KEY**: Returns 400 Bad Request
- **Invalid Input**: Form validation on frontend, detailed error messages
- **GROQ API Errors**: Catches and re-throws with meaningful error messages
- **Network Errors**: Handled gracefully with user-friendly messages

## Security Considerations

- ✅ JWT authentication required for API endpoint
- ✅ No user data stored (stateless generation)
- ✅ API key only used server-side
- ✅ Proper error messages without exposing sensitive data

## Future Enhancements

- [ ] Save generated letters to user profile
- [ ] History of generated applications
- [ ] Templates for specific industries
- [ ] Multi-language support
- [ ] AI feedback on draft quality
- [ ] Integration with job matching feature
- [ ] LinkedIn profile auto-fill
- [ ] Email scheduling and sending
- [ ] A/B testing generated versions

## Troubleshooting

### "GROQ API key is not configured"
- Check that GROQ_API_KEY is set in `.env`
- Restart the API server after updating `.env`

### "No response from GROQ API"
- Verify GROQ_API_KEY is valid
- Check GROQ API service status
- Ensure API rate limits not exceeded

### Form not submitting
- Check browser console for errors
- Verify JWT token is valid and not expired
- Check API endpoint URL is correct

### Generated content is not appearing
- Check browser console for network errors
- Verify API response contains expected fields
- Check that you selected the right generation type

## Integration Points

This feature integrates with:
- **Authentication**: Uses Supabase JWT via `SupabaseAuthGuard`
- **Profile Module**: Can be extended to save results to user profile
- **Matching Module**: Could be enhanced to use job matching insights
- **Database**: Could be extended to store generation history

## Related Files

- Backend Module: [ai-generation.module.ts](../src/ai-generation/ai-generation.module.ts)
- Frontend Component: [GenerateLetterForm.tsx](../../../frontend/src/components/GenerateLetterForm.tsx)
- Page: [ai-application/page.tsx](../../../frontend/src/app/(protected)/ai-application/page.tsx)
- HTTP Tests: [ai-generation.http](../http/ai-generation.http)
- App Module: [app.module.ts](../src/app.module.ts)
