ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_user_id_fkey";
ALTER TABLE "role_matches" DROP CONSTRAINT IF EXISTS "role_matches_candidate_id_fkey";
ALTER TABLE "gap_reports" DROP CONSTRAINT IF EXISTS "gap_reports_candidate_id_fkey";
ALTER TABLE "interview_sessions" DROP CONSTRAINT IF EXISTS "interview_sessions_candidate_id_fkey";

DROP TABLE IF EXISTS "refresh_tokens";
DROP TABLE IF EXISTS "users";