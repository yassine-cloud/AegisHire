apps/api/src/app.controller.spec.ts
apps/api/src/app.controller.ts
apps/api/src/app.service.ts
apps/api/src/auth/current-user.decorator.ts
apps/api/src/auth/email-verified.guard.ts
apps/api/src/auth/supabase-auth.guard.ts
apps/api/src/auth/admin-access.service.ts
apps/api/src/auth/admin.guard.ts
apps/api/src/auth/auth.module.ts
apps/api/src/auth/supabase-jwt.service.ts
apps/api/src/profile/dto/create-profile.dto.ts
apps/api/src/profile/dto/update-profile.dto.ts
apps/api/src/profile/entities/profile.entity.ts
apps/api/src/profile/profile.controller.spec.ts
apps/api/src/profile/profile.module.ts
apps/api/src/profile/profile.controller.ts
apps/api/src/profile/profile.service.spec.ts
apps/api/src/profile/profile.service.ts
apps/api/src/config/env.validation.ts
apps/api/src/github-analysis/github-analysis.controller.ts
apps/api/src/github-analysis/github-analysis.module.ts
apps/api/src/github-analysis/github-analysis.service.ts
apps/api/src/main.ts
apps/api/src/roles/dto/test-setup.dto.ts
apps/api/src/roles/dto/gap-report.dto.ts
apps/api/src/roles/dto/test-setup-request.dto.ts
apps/api/src/roles/roles.module.ts
apps/api/src/roles/roles.controller.spec.ts
apps/api/src/roles/roles.service.spec.ts
apps/api/src/roles/roles.controller.ts
apps/api/src/roles/roles.service.ts
apps/api/src/scripts/seed-test-role.ts
apps/api/src/shared/redis/redis.module.ts
apps/api/src/shared/redis/redis.service.ts
apps/api/src/graph-skill/dto/rebuild-graph.dto.ts
apps/api/src/graph-skill/graph-skill.controller.ts
apps/api/src/graph-skill/graph-skill.module.ts
apps/api/src/graph-skill/graph-skill.service.ts
apps/api/src/admin/admin.controller.ts
apps/api/src/admin/admin.module.ts
apps/api/src/admin/admin.service.ts
apps/api/src/admin/dto/create-admin-account.dto.ts
apps/api/src/admin/dto/update-admin-account.dto.ts
apps/api/src/companies/companies.controller.ts
apps/api/src/companies/companies.module.ts
apps/api/src/companies/companies.service.ts
apps/api/src/companies/dto/create-company-credentials.dto.ts
apps/api/src/companies/dto/create-job.dto.ts
apps/api/src/companies/dto/update-job.dto.ts
apps/api/src/companies/dto/upsert-company.dto.ts
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

// Get a free hosted Postgres database in seconds: `npx create-db`

generator client {
  moduleFormat = "cjs"
  provider     = "prisma-client"
  output       = "../generated/prisma"
  engineType   = "library"
}

datasource db {
  provider = "postgresql"
}

// --- Application models based on user's specification ---

enum SessionType {
  practice @map("practice")
  company  @map("company")
}

enum SessionStatus {
  created     @map("created")
  in_progress @map("in_progress")
  completed   @map("completed")
}

enum DifficultyLevel {
  introductory @map("introductory")
  medium       @map("medium")
  advanced     @map("advanced")
}

enum QuestionType {
  conceptual @map("conceptual")
  practical  @map("practical")
  design     @map("design")
}

enum AccountType {
  developer @map("developer")
  company   @map("company")
  admin     @map("admin")
}

model Profile {
  id               String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId           String      @unique @map("user_id") @db.Uuid
  accountType      AccountType @default(developer) @map("account_type")
  githubUsername   String?     @map("github_username") @db.VarChar(100)
  resumeFileUrl    String?     @map("resume_file_url") @db.Text
  skills           Json?
  githubAnalyzedAt DateTime?   @map("github_analyzed_at")
  resumeParsedAt   DateTime?   @map("resume_parsed_at")
  graphBuiltAt     DateTime?   @map("graph_built_at")
  archivedAt       DateTime?   @map("archived_at")
  createdAt        DateTime    @default(now()) @map("created_at")

  company          Company?    @relation("CompanyOwner")

  @@map("profiles")
}

model Company {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerUserId   String   @unique @map("owner_user_id") @db.Uuid
  name          String   @db.VarChar(255)
  industry      String?  @db.VarChar(255)
  size          String?  @db.VarChar(100)
  values        Json?
  websiteUrl    String?  @map("website_url") @db.Text
  description   String?  @db.Text
  contactEmail  String?  @map("contact_email") @db.VarChar(255)
  archivedAt    DateTime? @map("archived_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  ownerProfile Profile @relation("CompanyOwner", fields: [ownerUserId], references: [userId])
  jobs Job[]

  @@map("companies")
}

model Job {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  companyId       String   @map("company_id") @db.Uuid
  title           String   @db.VarChar(255)
  location        String?  @db.VarChar(255)
  employmentType  String?  @map("employment_type") @db.VarChar(100)
  description     String   @db.Text
  responsibilities Json?
  requirements    Json?
  salaryRange     String?  @map("salary_range") @db.VarChar(255)
  status          String   @default("published") @db.VarChar(50)
  archivedAt      DateTime? @map("archived_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  company Company @relation(fields: [companyId], references: [id])

  @@map("jobs")
}

model Role {
  id              Int      @id @default(autoincrement()) @db.Integer
  slug            String   @unique @db.VarChar(100) @map("slug")
  title           String   @db.VarChar(255)
  description     String?
  requiredSkills  Json?
  preferredSkills Json?
  createdAt       DateTime @default(now()) @map("created_at")

  roleMatches RoleMatch[]
  gapReports  GapReport[]
  sessions    InterviewSession[]

  @@map("roles")
}

model RoleMatch {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidateId        String   @map("candidate_id") @db.Uuid
  roleId             Int      @map("role_id")
  compatibilityScore Int?     @map("compatibility_score") @db.SmallInt
  matchedSkills      Json?    @map("matched_skills")
  missingSkills      Json?    @map("missing_skills")
  explanation        Json?    @map("explanation")
  computedAt         DateTime @default(now()) @map("computed_at")

  role Role @relation(fields: [roleId], references: [id])

  @@unique([candidateId, roleId])
  @@map("role_matches")
}

model GapReport {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidateId   String   @map("candidate_id") @db.Uuid
  roleId        Int      @map("role_id")
  gaps          Json
  priorityOrder Json     @map("priority_order")
  generatedAt   DateTime @default(now()) @map("generated_at")
  expiresAt     DateTime @default(dbgenerated("now() + interval '24 hours'")) @map("expires_at")

  role Role @relation(fields: [roleId], references: [id])

  @@unique([candidateId, roleId])
  @@map("gap_reports")
}

model InterviewSession {
  id          String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidateId String        @map("candidate_id") @db.Uuid
  roleId      Int           @map("role_id")
  sessionType SessionType   @map("session_type")
  status      SessionStatus @map("status")
  createdAt   DateTime      @default(now()) @map("created_at")
  completedAt DateTime?     @map("completed_at")

  role      Role                @relation(fields: [roleId], references: [id])
  questions InterviewQuestion[] @relation("session_questions")

  @@map("interview_sessions")
}

model InterviewQuestion {
  id           String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sessionId    String          @map("session_id") @db.Uuid
  sequence     Int             @db.SmallInt
  topic        String?         @db.VarChar(100)
  difficulty   DifficultyLevel
  questionText String          @map("question_text")
  questionType QuestionType    @map("question_type")
  targetSkill  String?         @map("target_skill") @db.VarChar(100)
  answerText   String?         @map("answer_text")
  answeredAt   DateTime?       @map("answered_at")

  session InterviewSession @relation("session_questions", fields: [sessionId], references: [id])

  @@map("interview_questions")
}

model InterviewPhaseReport {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidateId String   @map("candidate_id") @db.Text
  jobOfferId  String   @map("job_offer_id") @db.Text
  phase       String   @db.VarChar(40)
  report      Json
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([candidateId, jobOfferId])
  @@index([phase])
  @@map("interview_phase_reports")
}
