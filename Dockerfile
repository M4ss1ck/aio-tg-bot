# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app

# Build tools for native modules (sharp / vips)
RUN apk add --no-cache python3 make g++ vips-dev

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---- Builder ----
FROM base AS builder
WORKDIR /app

RUN apk add --no-cache vips vips-cpp

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm prisma-generate
RUN pnpm build-only

# ---- Runner ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Runtime deps for sharp
RUN apk add --no-cache vips vips-cpp

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# i18next-fs-backend reads JSON locales from cwd/locales at runtime
COPY --from=builder /app/locales ./locales

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
