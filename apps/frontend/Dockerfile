FROM node:22-bookworm-slim

WORKDIR /app

ENV CI=true
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# 1. Copy ONLY the package manifests to leverage Docker layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
# Add any other internal packages/apps package.json files here if frontend depends on them, e.g.:
# COPY packages/shared/package.json ./packages/shared/

# 2. Install dependencies (this layer will now be cached unless dependencies change)
RUN pnpm install --frozen-lockfile

# 3. Copy the rest of your application source code
COPY apps ./apps
COPY packages ./packages

# Build Arguments
ARG DATABASE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost
ARG API_INTERNAL_URL=http://api:3000

# Environment Variables for Build Time
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

# 4. Run the build step
RUN pnpm --filter frontend build

ENV PORT=4000
EXPOSE 4000

CMD ["pnpm", "--filter", "frontend", "start", "-H", "0.0.0.0", "-p", "4000"]