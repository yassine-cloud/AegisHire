CREATE TABLE IF NOT EXISTS "interview_phase_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" TEXT NOT NULL,
    "job_offer_id" TEXT NOT NULL,
    "phase" VARCHAR(40) NOT NULL,
    "report" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_phase_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "interview_phase_reports_candidate_id_job_offer_id_idx"
    ON "interview_phase_reports"("candidate_id", "job_offer_id");

CREATE INDEX IF NOT EXISTS "interview_phase_reports_phase_idx"
    ON "interview_phase_reports"("phase");
