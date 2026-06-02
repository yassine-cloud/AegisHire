-- CreateTable for JobApplication
CREATE TABLE "job_applications" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "job_id" uuid NOT NULL,
    "candidate_id" uuid NOT NULL,
    "status" character varying(50) NOT NULL DEFAULT 'applied',
    "applied_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_email" text,
    "generated_letter" text,
    "custom_notes" text,
    "archived_at" timestamp(3),
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_job_id_candidate_id_key" ON "job_applications"("job_id", "candidate_id");

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
