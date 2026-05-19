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

Spin up Postgres + Redis with the dev profile:

```bash
docker compose --profile dev up -d
```

Without `REDIS_URL`, sessions fall back to in-memory and are lost on restart.

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

Production runs only the `app` service (webhook mode). Postgres + Redis are expected to be external (or use the `dev` profile locally).

```bash
docker compose up --build -d
```

After the container is up, set the webhook once from your local machine (with prod env loaded):

```bash
pnpm set-webhook
```
