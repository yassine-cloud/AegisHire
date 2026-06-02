FROM node:22-bookworm-slim

WORKDIR /app

ENV CI=true
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build

ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "--filter", "api", "start:prod"]