Here is a concise picture based on the repo and `RUNNING.md`.

## What this feature does (simple)

1. **Profile / CV**  
   You upload a CV (PDF or image) in the browser. The **Python worker** reads the file, extracts text, and (if configured) uses an LLM to pull out **skills**. You can edit the badges, then **Save** sends those skills to the **Nest API** (`PATCH` profile).

2. **Gap report (test page)**  
   For a given role, the system compares “what the role needs” vs “what we know about you” **in the database** (role + `role_match` with `missing_skills`). The API calls the **worker**, which runs an **LLM** to turn those gaps into recommendations. The **Next** page `/test-gap-report` has a **“seed test data”** step so you do not have to hand-create roles/matches in SQL.

So: **CV → skills in Postgres profile**; **gap report → Postgres match data → worker LLM → JSON back to UI**.

---

## How to run each app

From the repo root (see `RUNNING.md`):

**Prerequisites:** Node 22+, pnpm, Python 3.12+, `uv`, Supabase (Auth + Postgres), env files, Prisma migrated. **Redis** via Docker:

```bash
docker compose up -d
```

**Install:** `pnpm install` at root; `cd apps/worker && uv sync` for the worker.

**Three terminals:**

| App | Command | Default URL |
|-----|---------|-------------|
| **Nest API** | `pnpm --filter ./apps/api dev` | `http://localhost:3001` (global prefix `api/v1`) |
| **Next frontend** | `pnpm --filter frontend dev` | `http://localhost:3000` |
| **Python worker** | `cd apps/worker` then `uv run fastapi dev` | `http://localhost:8000` |

You can also run API + frontend together with `pnpm dev` from root; **the worker is not included** in that and must be started separately (`package.json` root scripts mirror this).

**Env you need in practice:**  
- API: Supabase + `DATABASE_URL`, Redis, `WORKER_BASE_URL` (e.g. `http://localhost:8000`).  
- Frontend: `NEXT_PUBLIC_API_BASE_URL`, and for CV parse **`NEXT_PUBLIC_WORKER_URL`** (defaults in code to `http://127.0.0.1:8000` if unset).  
- Worker: `DATABASE_URL`, LLM vars (`LLM_PROVIDER`, keys, `LLM_MODEL_NAME`), and **Neo4j vars are still required in `Settings`** in `apps/worker/config.py` (see below) even if you only use `/parse-cv` and `/worker/generate-report`.

---

## How to test it

**“Mock” / automated (no real LLM or browser)**  
- In **`apps/api`**: `pnpm test` — Jest mocks Prisma/HTTP/Redis for things like `RolesService` and controller tests. That checks **API behavior and error paths**, not a real LLM.

**“Real” manual flow (full stack)**  
1. Start Redis, API, frontend, worker with real `.env` values.  
2. Log in on the frontend (Supabase auth).  
3. **`/profile`**: upload CV → **Extract** → **Save** (skills go to API).  
4. **`/test-gap-report`**: **Seed test data** → **Generate gap report**.  
   That hits the real **`GET /api/v1/roles/software-engineer/gap-report`**, which POSTs to the worker’s **`/worker/generate-report`**, which needs a working **LLM** config on the worker.

If the worker or LLM is down, you will see **503 / worker unavailable** style errors from the API, not a “mock” response.

---

## Seeder: what exists and when to use it

There are **two** mechanisms:

1. **`POST /api/v1/roles/test-setup` (the “Setup / Seed” button on `/test-gap-report`)**  
   - **When:** Local or QA, **while logged in** as the user you want to test.  
   - **What it does:** Upserts the `software-engineer` role, a **`role_match`** for *your* user id (with `missing_skills` and a low compatibility score), clears gap-report cache, and (in the version you have) ensures **`graphBuiltAt`** is set on your profile so the gap-report endpoint does not reject you as “profile incomplete.”  
   - **Use this** for the normal **UI test flow**.

2. **CLI script `apps/api/src/scripts/seed-test-role.ts`** (`pnpm seed:test-role` from `apps/api` per `package.json`)  
   - **When:** You want the same kind of data **without** the app, or for a **specific candidate UUID** (e.g. from Supabase).  
   - **Usage pattern:** pass that UUID as an argument (script header documents it).  
   - **Use this** for **ops / one-off DB seeding** or automation, not for everyday clicking through the UI.

---

## “Didn’t we get rid of Neo4j?” vs **`graphBuiltAt`**

**Neo4j in this repo today**

- The **gap report HTTP path** you use from Next (`/worker/generate-report` in `main.py`) loads context with **Postgres** (`psycopg` query on `role_matches` / `roles`). The current **`generate_gap_report`** in `gap_report_agent.py` does **not** call Neo4j; it defaults missing skills to **`current_level: "none"`** and sends them to the LLM.
- So for **this feature**, Neo4j is **not on the execution path** for gap reports anymore.
- However, the **worker still ships `neo4j_reader.py`, lists `neo4j` in dependencies, and `config.py` still requires `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD`** so the process can start. The architecture doc (`docs/Gap Report Architecture Decision.md`) even argues **against** Neo4j for gap reports — the codebase is in a **partially migrated** state: graph logic removed from the gap-report path, but **config and deps not fully removed**.

**Why `graphBuiltAt` keeps coming up**

- It is **not** Neo4j itself. It is a **Postgres column** on `profiles` (`graph_built_at` in Prisma).
- In **`RolesService.getGapReport`**, the API checks **`profile.graphBuiltAt`** and returns **`PROFILE_INCOMPLETE`** if it is missing. The message in code is literally about the **“candidate skill graph”** not being built — that naming is **legacy / product language** for “we are not ready to run gap analysis for this user yet,” even though today’s worker gap report is driven mainly by **`role_match.missing_skills`** + LLM, not by querying Neo4j.
- So we mention **`graphBuiltAt`** a lot because it is the **gate the Nest API enforces** before it will call the worker. Fixing the test flow meant making sure that flag gets set when you seed or when you save skills — **independent of whether Neo4j is still used anywhere**.

**Short answer:** You may have “gotten rid of Neo4j” **for gap reports**, but the repo still **mentions and configures** Neo4j in places, while **`graphBuiltAt`** is a **separate Postgres readiness flag** the API still checks.