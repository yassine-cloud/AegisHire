# AegisHire — Project Summary

## Project Description

AegisHire is an AI-powered technical hiring and career intelligence platform serving two sides of the hiring funnel:

- **Candidates**: self-assess their real technical profile, discover matching roles, get gap reports, and practice live AI interviews.
- **Companies**: evaluate applicants from GitHub repos and resumes, run adaptive interviews, and access explainable hiring decisions via an HR dashboard.

All AI outputs are probabilistic and explainable — no binary pass/fail verdicts. The system is built around a Developer Skill Graph (Neo4j) that maps what a candidate actually knows vs. what a role requires.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | NestJS (TypeScript), REST, Swagger |
| Frontend | Next.js |
| Worker / AI services | Python 3, FastAPI |
| Primary DB | PostgreSQL via Prisma ORM |
| Skill Graph DB | Neo4j 5.26 (graph: `User -[PROFICIENT_IN]-> Skill`) |
| Cache / real-time state | Redis (Alpine) |
| LLM chaining | LangChain (`langchain_groq`, `langchain_ollama`, `langchain_openai`, `langchain_anthropic`, `langchain_google_genai`) |
| LLM providers (priority) | Groq → Ollama → OpenAI / Anthropic / Gemini (explicit fallback) |
| Live interview model | Gemini Live API (`gemini-2.5-flash-native-audio-preview`) |
| Audio I/O | PyAudio (PCM 16-bit, 16 kHz input / 24 kHz output) |
| PDF generation | fpdf2 |
| Infrastructure | Docker Compose (Redis + Neo4j) |
| Testing | Jest (API), pytest (Worker) |

---

## Module List

### API (NestJS) — `apps/api/`
| Module | Responsibility |
|---|---|
| `roles` | Role CRUD, gap-report and test-setup endpoints; Redis caching |
| `shared/redis` | Cache wrapper with pattern-based key deletion |

### Frontend (Next.js) — `apps/frontend/`
| Component | Responsibility |
|---|---|
| `ProfileForm` | CV upload and skill extraction |
| `GapReportTester` | 2-step gap report testing UI |
| `auth/` | Login, signup, email-verify flows |

### Worker (FastAPI) — `apps/worker/`
| File / Module | Responsibility |
|---|---|
| `main.py` | Root FastAPI app, router mounts, logging |
| `github/` | GitHub repository analysis, skill extraction routes |
| `graph_skill/` | Skill Graph builder and `/graph-skill/*` router |
| `parsers/` | CV / resume parsing (`/parse-cv` endpoint) |
| `config.py` | Provider-specific model configuration via `get_settings()` |
| **`matching/`** | |
| `comparison_agent.py` | Reads Neo4j skill graph, scores candidate vs. role required/preferred skills → `ComparisonResult` |
| `gap_report_agent.py` | LLM-backed gap report: enriches missing skills with Neo4j confidence, calls LLM chain → `GapReportResult` |
| `explanation_agent.py` | LLM-backed human-readable match explanation → `ExplanationResult` (strengths, weaknesses, summary) |
| `neo4j_reader.py` | Read-only Neo4j driver wrapper; maps confidence float → `none / beginner / intermediate` |
| `schemas.py` | Shared Pydantic schemas (`GapReportResult`, `MissingSkill`, etc.) |
| `utils.py` | Shared helpers |
| **`interviewer/`** | |
| `interviewer.py` | `LiveInterviewer` — real-time voice interview using Gemini Live API; captures transcripts; generates PDF report on exit |

---

## Database Schema (PostgreSQL via Prisma)

| Model | Key Fields |
|---|---|
| `Profile` | userId, accountType, githubUsername, resumeFileUrl, `skills` (JSONB), timestamps |
| `Company` | ownerUserId → Profile, name, industry, values (JSON) |
| `Job` | companyId → Company, title, description, requirements (JSON), status |
| `Role` | slug, title, `requiredSkills` (JSON), `preferredSkills` (JSON) |
| `RoleMatch` | candidateId + roleId (unique), compatibilityScore, matchedSkills, missingSkills, explanation |
| `GapReport` | candidateId + roleId (unique), gaps (JSON), priorityOrder, expires after 24 h |
| `InterviewSession` | candidateId, roleId, sessionType (`practice`/`company`), status |
| `InterviewQuestion` | sessionId, sequence, difficulty, questionType, targetSkill, answerText |
| `InterviewPhaseReport` | candidateId, jobOfferId, phase, report (JSON) |

---

## Data Flow

```
Candidate Input
  ├── GitHub username  ──► github/ module  ──► Neo4j Skill Graph
  │                                              (User)-[PROFICIENT_IN {confidence}]->(Skill)
  └── Resume / CV     ──► parsers/ module ──► Profile.skills (PostgreSQL JSONB)

Role Matching Flow
  1. API receives match request (candidateId + roleId)
  2. Checks Redis cache (24 h TTL); if hit → return cached RoleMatch
  3. Cache miss → POST to Worker /matching/compare
       comparison_agent.py:
         - Reads all candidate skills from Neo4j
         - Scores required skills (weight 2.0) + preferred skills (weight 1.0)
         - Returns ComparisonResult { compatibility_score, matched_skills, missing_skills }
  4. POST to Worker /matching/explain
       explanation_agent.py:
         - LLM chain (Groq → Ollama → explicit) with structured output ExplanationResult
         - Returns { strengths[], weaknesses[], summary }
  5. Persists RoleMatch to PostgreSQL; stores in Redis

Gap Report Flow
  1. API receives gap report request (candidateId + roleId)
  2. Checks Redis cache; if hit → return cached GapReport
  3. Cache miss → POST to Worker /matching/gap-report
       gap_report_agent.py:
         - Fetches candidate skill confidence from Neo4j per missing skill
         - Maps confidence → none / beginner / intermediate
         - Invokes LLM chain (Groq → Ollama → explicit) with structured output GapReportResult
         - Returns { gaps[{ skill, importance, current_level, recommendation, estimated_effort }],
                     overall_priority_order[] }
  4. Persists GapReport to PostgreSQL (expires 24 h); stores in Redis

Live Interview Flow
  1. interviewer.py connects to Gemini Live API (bidirectional audio stream)
  2. Mic audio captured via PyAudio → sent as PCM chunks to Gemini
  3. Model audio response → played back via PyAudio speaker
  4. Input/output transcriptions captured in transcript[]
  5. On exit (Ctrl+C or error): generate_pdf_report() calls LLM for structured summary
     → saves interview_review_<timestamp>.pdf
```

---

## LLM Provider Selection Logic (Worker)

```
if GROQ_API_KEY present  → ChatGroq (preferred, fast inference)
elif OLLAMA_BASE_URL set  → ChatOllama (local, no cost)
else                      → explicit llm_provider from settings
                            (openai | anthropic | groq | gemini | ollama)
```

All LLM calls use `langchain` structured output (`.with_structured_output(PydanticModel)`) so results are validated Pydantic objects, never raw strings.

---

## Ports

| Service | Port |
|---|---|
| API (NestJS) | 3000 (default) |
| Worker (FastAPI) | 8000 |
| Frontend (Next.js) | 3001 (default) |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Neo4j HTTP | 7474 |
| Neo4j Bolt | 7687 |

---

## Current State (as of Feature 5)

Feature 5 (Gap Report workflow) is complete and merged:
- End-to-end: signup → CV upload → skill extraction → gap report generation
- 80+ files changed, ~14k lines added
- Tests: Jest (API) + pytest (Worker) passing
- Next up: Issue #2 Role Creation, Issue #3 Role Matching automation
