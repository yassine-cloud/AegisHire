-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AccountType" AS ENUM ('developer', 'company', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "account_type" "AccountType" NOT NULL DEFAULT 'developer';

-- CreateTable
CREATE TABLE IF NOT EXISTS "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "industry" VARCHAR(255),
    "size" VARCHAR(100),
    "values" JSONB,
    "website_url" TEXT,
    "description" TEXT,
    "contact_email" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "companies_owner_user_id_key" ON "companies"("owner_user_id");