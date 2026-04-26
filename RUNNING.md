# AegisHire - Team Run Guide

This document explains how to run the project from zero.

## 1. Project Stack And Locations

- `apps/frontend`: Next.js 16 + React 19 + TypeScript
- `apps/api`: NestJS 11 + TypeScript
- `apps/worker`: FastAPI + Python 3.12 (managed with `uv`)
- `packages/db`: Prisma 7 + PostgreSQL adapter package (`@aegishire/db`)

## 2. Prerequisites

Install these tools on your machine:

- Node.js 22+
- pnpm 10+
- Python 3.12+
- uv (Python package manager/runner)
- A Supabase project (Auth + Postgres)

Quick checks:

```bash
node -v
pnpm -v
python --version
uv --version
```

## 3. Environment Files

Create these files before running the app:

- `apps/api/.env`
- `packages/db/.env`

Use this value format (replace credentials if needed):

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"
```

Notes:

- `apps/api/.env` is used when running the API.
- `packages/db/.env` is used by Prisma commands in `packages/db`.
- Keep both files aligned to the same Supabase database while developing.
- For this auth feature branch, avoid localhost DB URLs so all teammates validate against the shared Supabase project.
- Use `DATABASE_URL` for runtime and pooled traffic; use `DIRECT_URL` for Prisma migration/introspection when needed.

## 4. Database Setup

1. Create a Supabase project and copy the Postgres connection string into both env files.
2. Ensure SSL mode is enabled in the connection string (`sslmode=require`).

## 5. Install Dependencies

From repository root:

```bash
pnpm install
```

For worker dependencies:

```bash
cd apps/worker
uv sync
```

## 6. Apply Prisma Schema

From repository root:

```bash
pnpm --filter @aegishire/db run db:generate
pnpm --filter @aegishire/db run db:migrate
pnpm --filter @aegishire/db run build
```

Optional DB browser:

```bash
pnpm --filter @aegishire/db run db:studio
```

## 7. Start The Application

Use separate terminals.

Terminal 1 (API):

```bash
pnpm --filter ./apps/api dev
```

Terminal 2 (Frontend):

```bash
pnpm --filter frontend dev
```

Terminal 3 (Worker):

```bash
cd apps/worker
uv run fastapi dev
```

Note: `graph_skill` routes are served by the same worker app (single FastAPI process)
under the `/graph-skill` prefix.

You can also start API + Frontend together from root:

```bash
pnpm dev
```

Worker is not included in `pnpm dev` and should be started separately.

## 8. Default Local URLs

- Frontend: `http://localhost:3000`
- API: `http://localhost:3001`
- Worker: `http://localhost:8000`
- Prisma Studio (when started): `http://localhost:5555`

## 9. Common Issues

- `SASL ... client password must be a string`:
  - Check `DATABASE_URL` exists and is valid in both env files.
- Prisma cannot connect to DB:
  - Ensure both `apps/api/.env` and `packages/db/.env` point to the same Supabase DB.
  - Confirm `sslmode=require` is present in the URL.
- Prisma migration UUID errors:
  - Ensure `CREATE EXTENSION IF NOT EXISTS pgcrypto;` exists in the target database.
- API cannot import `@aegishire/db`:
  - Rebuild DB package:

    ```bash
    pnpm --filter @aegishire/db run build
    ```
