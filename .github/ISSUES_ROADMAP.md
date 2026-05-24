# Feature Roadmap: Gap Report & Role Management

## Issue #2: Role Creation (Manual + AI Parsing)

**Type:** Feature  
**Priority:** High  
**Depends on:** PR #11 (Gap Report)  
**Effort:** 2 weeks  

### Description
Users and administrators need a way to create roles in the system. Currently, only seeding via `/test-setup` or direct database manipulation is supported. This issue implements two complementary paths:

1. **Manual Role Creation** — Provide an API endpoint (`POST /api/v1/roles`) where administrators can directly supply role details.
2. **AI-Parsed Role Creation** — Provide an endpoint (`POST /api/v1/roles/from-description`) where users paste a job description, and the worker LLM extracts structured role details.

### Requirements

#### Manual Endpoint
- **POST `/api/v1/roles`** (admin-only)
  - Input: `{ slug, title, description, requiredSkills[], preferredSkills[] }`
  - Output: created role record
  - Validation: unique slug constraint; skill list validation
  - Auth: Supabase JWT with admin role (to be defined)

#### AI-Parsed Endpoint
- **POST `/api/v1/roles/from-description`** (authenticated users)
  - Input: `{ jobDescription: string }`
  - Output: suggested role (title, requiredSkills, preferredSkills); user confirms before save
  - Worker integration: calls worker `/worker/parse-role-description`
  - Error handling: timeout, malformed LLM output, worker unavailable

#### Worker Changes
- New endpoint: **`POST /worker/parse-role-description`**
  - Input: `{ job_description: string }`
  - Output: `{ title, required_skills[], preferred_skills[], parsed_at }`
  - Uses same LLM config as gap-report generation (prefer Groq → Ollama)
  - Pydantic schema validation on output

### Acceptance Criteria
- [ ] Manual role creation endpoint works with validation
- [ ] AI parsing endpoint extracts skills from job descriptions accurately
- [ ] Worker endpoint handles timeouts and malformed outputs gracefully
- [ ] Both endpoints are protected by Supabase auth
- [ ] Full API test coverage (controller + service specs)
- [ ] Worker tests pass for parse-role-description
- [ ] /api/v1/roles GET endpoint lists roles (public or paginated)

### Notes
- Extend profile/admin guards (placeholder: `IsAdminGuard`)
- Use same LLM provider preference logic as gap reports
- Consider caching parsed role descriptions in Redis for dedup
- Future: bulk role import from job board APIs

---

## Issue #3: Role Matching Computation

**Type:** Feature  
**Priority:** High  
**Depends on:** PR #11 (Gap Report), Issue #2 (Role Creation)  
**Effort:** 2.5 weeks  

### Description
Currently, `role_matches` are only created manually via seeding. This issue implements automated role-candidate matching: when a user completes their profile (uploads CV, extracts skills), the system computes which roles they are compatible with and stores the results.

### Requirements

#### Matching Logic
- **Candidate Profile Ready** → trigger matching
  - When: `PATCH /api/v1/profile/me` completes with skills
  - Compute: which roles match this candidate
  
- **Skill Comparison Algorithm**
  - Extract candidate skills from `Profile.skills` (JSONB)
  - For each role, compute:
    - **Matched skills**: intersection of candidate skills ∩ role required skills
    - **Missing skills**: role required skills - candidate skills
    - **Bonus skills**: candidate skills - role required skills (not penalized)
    - **Compatibility Score**: $(100 \times \text{matched} / (\text{matched} + \text{missing}))$
    - Threshold: store match if score < 70 (gap report candidate); skip if >= 70

- **Worker API** (optional; for future fuzzy matching)
  - **POST `/worker/compute-role-matches`** (v2 enhancement)
  - Input: `{ candidate_id, skills[] }`
  - Output: `{ matches: [{ role_id, compatibility_score, missing_skills }] }`
  - Uses embedding similarity (future: pgvector)

#### API Endpoints
- **POST `/api/v1/candidates/:id/compute-matches`** (admin/self)
  - Trigger match computation for a candidate
  - Output: list of new/updated matches
  
- **GET `/api/v1/candidates/:id/role-matches`** (authenticated)
  - List all roles matched for this candidate
  - Query params: `?minScore=0&maxScore=100&limit=10`

#### Database Changes
- Update `role_matches` table schema if needed (already exists; extend with computed metadata if necessary)
- Add index on `(candidateId, compatibilityScore)` for queries

### Acceptance Criteria
- [ ] Skill matching algorithm is correct (unit tests)
- [ ] Matches computed automatically on profile save
- [ ] Only store matches with score < 70 (gap report candidates)
- [ ] GET endpoint lists matches with filtering
- [ ] Trigger matches recomputed when role is updated
- [ ] Full test coverage for matching service
- [ ] Performance: < 500ms for 50 roles per candidate (optimize queries)
- [ ] Handle edge cases: empty skills, no roles, skill name normalization

### Notes
- Implement skill **normalization**: `"react.js"` ≈ `"reactjs"` (optional for v1; use exact matching)
- Consider **async job** for bulk recomputation (BullMQ + Redis)
- Future: **embedding-based matching** with pgvector for fuzzy skill similarity
- Future: **machine learning model** to weight skills by importance

### Next Steps (After Both Issues)
- Issue #4: **Batch Role Import** (CSV/API)
- Issue #5: **Candidate Recommendation Engine** (suggest roles for user)
- Issue #6: **Role Analytics Dashboard** (who matches which roles over time)
