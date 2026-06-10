# All-in-one Telegram bot

> "One bot to rule them all"

This is what you get when you combine [Bot Manager](https://github.com/M4ss1ck/bot-manager) with [MassickBot v2](https://github.com/M4ss1ck/tg-telegraf-bot).

Full-featured constantly-evolving Telegram bot with WebApp support and a `/clone` command to allow users to have their own copy.

## Stack

- [Next.js](https://nextjs.org/) – WebApp + production webhook server (`/api/bot`).
- [Tailwind CSS](https://tailwindcss.com/) – WebApp styling.
- [grammY](https://grammy.dev/) – Telegram Bot framework (plugins: `hydrate`, `parse-mode`, `auto-retry`, `storage-redis`).
- [Prisma](https://www.prisma.io/) v7 with the PostgreSQL driver adapter (no Rust engine).
- [Redis](https://redis.io/) – session storage (optional; falls back to in-memory).

## How it runs

| Mode | How | When |
| --- | --- | --- |
| Polling | `pnpm dev` → `telegram/runner/polling.ts` (uses `bot.start()`) | Local dev, no public URL needed |
| Webhook | Next.js POST at `/api/bot` via grammY's `webhookCallback` | Production + `pnpm dev:next` |

Cloned bots run only in webhook mode at `/api/token/[token]`.

## Development

### Environment Variables

Copy `.env.example` to `.env` and fill in the values you need.

Required: `TOKEN`, `DATABASE_URL`, `ADMIN_ID`, `NEXT_PUBLIC_DOMAIN`, `NEXT_PUBLIC_SITEKEY`.
Optional: `REDIS_URL`, `OPENROUTER_API_KEY`, `CLOUDFLARE_*`, `TG_API`, `TGWD_SECRET`, `VICTIM_ID`.

### Local services

Spin up Postgres + Redis with the local Compose override:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d db redis
```

For a full local Docker stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

When running the app inside Compose, use the Docker service hostname in `.env`: `DATABASE_URL=postgres://postgres:postgres@db:5432/tgbot`. When running `pnpm dev` on the host against Compose Postgres, use `DATABASE_URL=postgres://postgres:postgres@localhost:5433/tgbot`.

By default, the app is exposed on host port `3000`, local Postgres on `5433`, and Redis on `6380` to avoid clashing with existing local services. Override them in `.env` if needed:

```dotenv
APP_PORT=3001
POSTGRES_PORT=55433
REDIS_PORT=56380
```

For Redis-backed sessions while running on the host, set `REDIS_URL=redis://localhost:6380`. In the full Compose stack, leave `REDIS_URL` unset or set it to `redis://redis:6379`. Without `REDIS_URL`, sessions fall back to in-memory and are lost on restart.

### Running the Bot

```bash
# Install dependencies
pnpm install

# Generate Prisma client and push schema
pnpm prisma

# Polling mode (no webhook needed)
pnpm dev

# Webhook mode via Next.js (sets webhook, then starts the dev server)
pnpm dev:next
```

### Webhook setup

`scripts/set-webhook.ts` registers `NEXT_PUBLIC_DOMAIN/api/bot` with Telegram. `pnpm dev:next` runs it automatically; you can also call it directly:

```bash
pnpm set-webhook
```

### Docker deployment

Coolify should run this project in Docker Compose deployment mode, using the repository default `docker-compose.yml` file. Do not use Nixpacks, do not enable dev profiles, and do not rely on a production `.env` file on disk.

The production Compose stack starts the `app` service in webhook mode plus a Redis service. Postgres remains external: set `DATABASE_URL` in the Coolify dashboard along with the rest of the app environment. The compose file declares the variables Coolify needs to discover and inject.

Required Coolify dashboard variables:

- `TOKEN`
- `DATABASE_URL`
- `ADMIN_ID`
- `NEXT_PUBLIC_DOMAIN`
- `NEXT_PUBLIC_SITEKEY`

Optional Coolify dashboard variables:

- `SET_WEBHOOK_ON_START` (defaults to `true`; set to `false` to skip startup webhook registration)
- `TG_WEBHOOK_SECRET` (shared secret used to verify Telegram webhook requests; leave unset to disable verification)
- `OPENROUTER_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `TG_API`
- `TGWD_SECRET`
- `VICTIM_ID`

`REDIS_URL` may be left unset to use the Compose Redis service (`redis://redis:6379`), or set it explicitly to point at an external Redis.

Do not publish a host port for the production app. The compose file exposes container port `3000`; configure the Coolify domain/proxy to route to that port.

```bash
docker compose up --build -d
```

On production startup, `scripts/start-production.mjs` launches the Next.js standalone server and, once it is listening, registers `https://<NEXT_PUBLIC_DOMAIN>/api/bot` with Telegram (dropping pending updates and subscribing to all update types). Webhook registration is best-effort: if it fails, the server keeps running. For manual repair from your local machine, load the production env and run:

```bash
pnpm set-webhook
```
