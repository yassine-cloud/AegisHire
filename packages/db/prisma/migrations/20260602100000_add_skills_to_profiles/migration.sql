-- AlterTable: add skills column to profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "skills" JSONB;
