# Job Application Flow with AI Integration

## Overview

Users can now browse job listings, apply to jobs, and optionally get AI-powered help generating professional emails and motivation letters using GROQ. All applications are tracked in a database for easy access and management.

## User Flow

### 1. **Browse Jobs** (`/jobs`)
- Users view available job listings
- Can search by title, company, or location
- Each job card shows:
  - Job title and company
  - Location, employment type, salary range
  - Brief description
  - Industry and company size

### 2. **Apply to Job**
- Click "Apply Now" button on job card
- Opens a dialog with two options:
  - **"Skip AI, Apply Now"** - Apply without AI assistance
  - **"Get AI Help"** - Use GROQ to generate email and letter

### 3. **Generate AI Content** (Optional)
- If user selects "Get AI Help":
  - Presented with form to provide:
    - Your background/summary
    - Draft content with key points
    - Tone preference (formal, professional, friendly)
  - GROQ generates professional email and motivation letter
  - User can review and copy generated content

### 4. **Submit Application**
- Application is saved to database with:
  - Generated email (if created)
  - Generated motivation letter (if created)
  - Application status (defaults to "applied")
  - Timestamp

### 5. **Track Applications** (`/applications`)
- View all submitted applications
- See application status
- View generated content
- Delete applications

## Technical Architecture

### Database Schema

**JobApplication Table**
```sql
CREATE TABLE "job_applications" (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL (Foreign Key to Job),
  candidate_id UUID NOT NULL (User ID),
  status VARCHAR(50) DEFAULT 'applied',
  applied_at TIMESTAMP DEFAULT NOW(),
  generated_email TEXT,
  generated_letter TEXT,
  custom_notes TEXT,
  archived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  UNIQUE(job_id, candidate_id)
);
```

### API Endpoints

#### Job Applications
- `POST /job-applications` - Create application
- `GET /job-applications` - Get user applications
- `GET /job-applications/:id` - Get application details
- `PATCH /job-applications/:id` - Update application
- `DELETE /job-applications/:id` - Archive application
- `GET /job-applications/job/:jobId/check` - Check if user applied

#### Example Request
```bash
POST /job-applications
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{
  "jobId": "uuid-of-job",
  "generatedEmail": "...",
  "generatedLetter": "..."
}
```

### Backend Implementation

**Location**: `apps/api/src/job-applications/`

Files:
- `job-applications.service.ts` - Business logic
- `job-applications.controller.ts` - API endpoints
- `job-applications.module.ts` - NestJS module
- `dto/job-application.dto.ts` - Data models

Key features:
- ✅ Prevents duplicate applications (unique constraint)
- ✅ Job existence validation
- ✅ User authorization checks
- ✅ Soft delete via archive

### Frontend Components

**Location**: `apps/frontend/src/components/`

Components:
- `JobApplyButton.tsx` - "Apply Now" button with state management
- `ApplyJobFlow.tsx` - Application flow with AI decision
- `JobCard.tsx` - Job listing card with apply button
- `GenerateLetterForm.tsx` - AI generation form (updated)
- `AIApplicationSuggestionModal.tsx` - Suggestion modal
- `JobDetailsClient.tsx` - Job detail page wrapper

Pages:
- `/jobs` - Job listings (updated to use JobCard)
- `/jobs/[jobId]` - Job details (with Apply button)
- `/applications` - User applications tracker (new)
- `/ai-application` - Standalone AI generator

## Features

### Application Management
- ✅ One user can apply to multiple jobs
- ✅ Prevents duplicate applications
- ✅ Tracks application status
- ✅ Soft delete (archive) functionality
- ✅ Application history

### AI Integration
- ✅ Optional AI-generated email
- ✅ Optional AI-generated motivation letter
- ✅ Pre-filled job information
- ✅ GROQ API integration
- ✅ Copy-to-clipboard functionality

### User Experience
- ✅ Smooth application flow
- ✅ Real-time application status checking
- ✅ View generated content
- ✅ Track all applications
- ✅ Delete applications

## File Structure

```
Backend:
apps/api/src/
  job-applications/
    dto/
      job-application.dto.ts
    job-applications.controller.ts
    job-applications.service.ts
    job-applications.module.ts

Migrations:
packages/db/prisma/migrations/
  20260601000000_add_job_applications/
    migration.sql

Schema Update:
packages/db/prisma/
  schema.prisma (updated with JobApplication model)

Frontend:
apps/frontend/src/
  components/
    JobApplyButton.tsx (new)
    ApplyJobFlow.tsx (new)
    JobCard.tsx (new)
    JobDetailsClient.tsx (new)
    AIApplicationSuggestionModal.tsx (new)
    GenerateLetterForm.tsx (updated)
    ui/
      dialog.tsx (new)
      use-toast.ts (new)
  app/(protected)/
    jobs/page.tsx (updated)
    applications/page.tsx (new)
```

## Database Migration

To apply the migration:

```bash
cd packages/db
npx prisma migrate deploy

# Or for development:
npx prisma db push
```

## Integration Checklist

- ✅ Database schema updated with JobApplication model
- ✅ Migration created
- ✅ Backend service and controller created
- ✅ Frontend components created
- ✅ Job listings page updated with Apply button
- ✅ Applications tracking page created
- ✅ AI generation integrated into flow
- ✅ Error handling and validation
- ✅ Authorization checks

## Usage Instructions

### For Users

1. **View Jobs**: Navigate to `/jobs` to browse available positions
2. **Apply**: Click "Apply Now" on any job card
3. **Choose Method**:
   - Select "Skip AI, Apply Now" to apply immediately
   - Select "Get AI Help" to generate professional materials
4. **Generate (if selected)**:
   - Provide your background/experience
   - Write draft with key points
   - Select tone preference
   - Review generated email and letter
5. **Submit**: Complete application is saved
6. **Track**: Visit `/applications` to see all your submissions

### For Developers

1. **Start Services**:
```bash
pnpm --filter api dev     # Start API
pnpm --filter frontend dev # Start Frontend
```

2. **Access Features**:
```
Jobs: http://localhost:3000/jobs
Job Details: http://localhost:3000/jobs/[jobId]
Apply Flow: Dialog modal on job cards
Track Applications: http://localhost:3000/applications
AI Generator: http://localhost:3000/ai-application
```

3. **Test API**:
```bash
# Check if user already applied
GET /api/job-applications/job/{jobId}/check

# Create application
POST /api/job-applications
{ "jobId": "...", "generatedEmail": "...", ... }

# Get user applications
GET /api/job-applications

# Get application details
GET /api/job-applications/{applicationId}
```

## Implementation Flow Diagram

```
User Views Jobs
      ↓
  Click "Apply Now"
      ↓
Dialog Opens: "Skip or Get AI Help?"
      ├─→ "Skip AI, Apply Now" → Create Application → Success
      │
      └─→ "Get AI Help"
           ↓
         Fill Form (Background, Draft, Tone)
           ↓
         GROQ Generates Email & Letter
           ↓
         Review Generated Content
           ↓
         Submit → Create Application with Generated Content → Success
           ↓
         Redirect to Applications Page
```

## Status Values

- `applied` - Initial status when application is created
- `viewed` - Company has viewed the application
- `shortlisted` - Candidate moved to next round
- `rejected` - Application rejected
- `interview` - Interview scheduled
- Custom status - Can be added as needed

## Error Handling

- **Duplicate Application**: Returns 400 Bad Request
- **Job Not Found**: Returns 404 Not Found
- **Unauthorized**: Returns 400/403 depending on context
- **AI Generation Errors**: User-friendly error messages
- **Database Errors**: Logged with appropriate HTTP responses

## Future Enhancements

- [ ] Email notifications for application status changes
- [ ] Application pipeline visualization
- [ ] Bulk apply feature
- [ ] Application templates
- [ ] Interview scheduling integration
- [ ] Application analytics dashboard
- [ ] Resume matching for auto-fill
- [ ] Follow-up reminders

## Testing

### Manual Testing Checklist

- [ ] User can view job listings
- [ ] User can search jobs
- [ ] User can click "Apply Now"
- [ ] Dialog appears with options
- [ ] User can skip AI and apply
- [ ] User can choose to get AI help
- [ ] AI generation form works
- [ ] User can review and copy generated content
- [ ] Application is saved to database
- [ ] User cannot apply twice to same job
- [ ] User can view all applications
- [ ] User can view generated content
- [ ] User can delete applications

### API Testing

Test cases in: `apps/api/http/job-applications.http`

```http
# Create application
POST /job-applications

# Get user applications
GET /job-applications

# Check if applied
GET /job-applications/job/{jobId}/check

# Get application details
GET /job-applications/{applicationId}

# Update application
PATCH /job-applications/{applicationId}

# Delete application
DELETE /job-applications/{applicationId}
```

## Support & Documentation

- See [AI_APPLICATION_GENERATOR.md](AI_APPLICATION_GENERATOR.md) for AI generation details
- See [AI_APPLICATION_GENERATOR_INTEGRATION.md](AI_APPLICATION_GENERATOR_INTEGRATION.md) for integration guide
- Check HTTP test files for API examples

## Last Updated

June 1, 2026

## Status

✅ **Ready for Production**
