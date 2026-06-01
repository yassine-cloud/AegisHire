# Interview Module Integration

This module is designed to be launched by another part of the product after a candidate is matched to a job offer.

## Frontend Entry

Open the interview page with job and candidate context in the query string:

```text
/interview?workerUrl=http://localhost:8000&candidateId=<candidate-id>&jobOfferId=<job-offer-id>&jobTitle=<title>&jobDescription=<description>&requiredSkills=<skills>
```

`requiredSkills` can be either a comma-separated string:

```text
React,Next.js,Node.js,PostgreSQL
```

or a JSON array encoded for a URL:

```json
["React","Next.js","Node.js","PostgreSQL"]
```

Supported query params:

| Param | Required | Notes |
| --- | --- | --- |
| `workerUrl` | yes | Worker/FastAPI base URL, for example `http://localhost:8000`. |
| `candidateId` | yes | Candidate/user id. Saved with reports. |
| `jobOfferId` | yes | Job offer id. Saved with reports. |
| `jobTitle` | yes | Used for interview and problem-test generation. |
| `jobDescription` | yes | Used for interview and problem-test generation. |
| `requiredSkills` | yes | Comma-separated or JSON-array skill list. |

When these values are present, the candidate only sees the mode selector (`text` or `live`) and the supplied job context.

## Interview Flow

The page starts an interview with:

```http
POST /interview/start
```

Payload:

```json
{
  "job_title": "Senior Full-Stack Engineer",
  "job_description": "Build and scale microservices...",
  "required_skills": ["React", "Next.js", "Node.js"],
  "mode": "text",
  "candidate_id": "candidate-id",
  "job_offer_id": "job-offer-id"
}
```

Live mode sends the same context through the `/interview/live` websocket start message.

On successful completion (`FINISHED`), the worker saves an `interview` phase report containing:

- candidate id
- job offer id
- interview mode
- transcript
- summary
- analytical review
- end reason

If the candidate is flagged `NOT_SERIOUS`, the interview does not unlock the next phase.

## Problem-Solving Phase

After a successful interview, the page unlocks a problem-solving test.

The worker generates:

- 2 find-the-error tasks
- 2 design/concept tasks
- 1 coding task

Generation endpoint:

```http
POST /assessment/start
```

The module uses Groq via `GROQ_API_KEY` and `GROQ_MODEL_NAME`.

Submission endpoint:

```http
POST /assessment/submit
```

The saved `problem_solving` report includes:

- candidate id
- job offer id
- assessment id
- generated tasks
- candidate answers
- cheating/integrity flags

## Anti-Cheating Signals

The frontend logs these flags during the problem-solving phase:

- paste attempts
- tab switching
- unusually fast writing

These are not hard blockers except paste, which is prevented in the answer textareas. All warnings are saved in the problem-solving phase report.

## Database

Run the Prisma migration:

```bash
npx prisma migrate dev
```

New table:

```text
interview_phase_reports
```

Important columns:

- `candidate_id`
- `job_offer_id`
- `phase`
- `report` JSONB
- `created_at`

This table is intentionally separate from the existing `interview_sessions` tables because the external module owns the job-offer identity.
