-- AlterTable
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "companies"
ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "location" VARCHAR(255),
    "employment_type" VARCHAR(100),
    "description" TEXT NOT NULL,
    "responsibilities" JSONB,
    "requirements" JSONB,
    "salary_range" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'published',
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;