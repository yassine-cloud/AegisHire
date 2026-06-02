FROM node:22-bookworm-slim

WORKDIR /app

ENV CI=true
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

ARG DATABASE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
ARG API_INTERNAL_URL=http://api:3000

ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

RUN pnpm install --frozen-lockfile
RUN pnpm --filter frontend build

ENV PORT=4000

EXPOSE 4000

CMD ["pnpm", "--filter", "frontend", "start", "-H", "0.0.0.0", "-p", "4000"]