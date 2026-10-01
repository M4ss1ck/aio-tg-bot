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

Cloned bots are webhook-only: manual clones keep `/api/token/[token]`, managed clones use `/api/clones/[id]` with a per-clone webhook secret.

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

## Managed clone onboarding

Users can create a clone without ever seeing or pasting a bot token. Everything happens inside Telegram:

1. The user sends `/clone` in a **private chat** with the main bot.
2. The main bot replies with a **Create bot in Telegram** inline URL button. Telegram opens its own managed-bot creation flow with the main bot named as manager.
3. The user picks the clone's display name and username and confirms creation in Telegram.
4. Telegram sends the main bot a `managed_bot` update. The main bot fetches the new bot's token from Telegram, stores it, **registers the clone's webhook automatically**, and replies with the clone's username and a link to open it.

No token is copied into the chat, and there is no separate webhook button to press. The manual route `/clone <token>` still works unchanged for users who already created a bot in BotFather, and clones created that way keep their existing webhook route. A `/clone` sent in a group chat gets a link back to a private conversation with the main bot.

### Operator prerequisites

The main bot — not the clone — must be allowed to manage bots. In the BotFather Mini App, open the main bot and enable **bot management** for it. The button is only offered when the main bot's `getMe` reports `can_manage_bots: true`, so the credential-free way to verify the setting is to send `/clone` in a private chat with the main bot:

- the **Create bot in Telegram** button appears → bot management is enabled and the flow is available;
- the manual path is offered instead with a reason → bot management is off, enable it in BotFather and retry.

Do not check this by calling the Bot API with the token pasted into a shell command: that writes the token into shell history and process listings. The project's own scripts read `TOKEN` from the environment instead.

### Schema push before deploy

Managed clone onboarding adds columns to `Bot` (`telegramId`, `webhookSecret`, `connected`, `connectingAt`, `lastUpdateId`, `quarantined`, `createdAt`, `updatedAt`), makes `Bot.token` nullable, and creates the `ManagedCloneAttempt` table. Nothing applies this for you: the Dockerfile builder runs only `prisma-generate` and `build-only`, never `db push`. Apply it to production before deploying or restarting the app, because the new code queries those columns.

With `DATABASE_URL` pointing at production, preview the SQL first:

```bash
pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Expect only `ALTER TABLE "Bot" ADD COLUMN ...` lines, `ALTER COLUMN "token" DROP NOT NULL`, `CREATE TABLE "ManagedCloneAttempt"` and `CREATE UNIQUE INDEX "Bot_telegramId_key"`. If the preview contains any `DROP COLUMN` or `DROP TABLE`, stop: the production database has drifted from this schema.

Then push it:

```bash
pnpm prisma-push --accept-data-loss
```

`--accept-data-loss` is needed because Prisma warns about every new unique index ("If there are existing duplicate values, this will fail"). Here it is safe: `telegramId` is a new column, so every existing row holds `NULL`, and Postgres allows any number of `NULL`s under a unique index. No existing row or column is removed. Existing clone rows keep their token and keep working on `/api/token/[token]`.

After the push, let Coolify redeploy or restart the Compose `app` service; startup then registers the main webhook as usual. The BotFather management permission above and the live checklist below are still required. The schema push alone does not make the flow live.

### `managed_bot` update subscription

The main bot receives `managed_bot` updates, so every registration path must subscribe to it:

| Path | Where |
| --- | --- |
| Webhook registration | `scripts/set-webhook.ts` (`API_CONSTANTS.ALL_UPDATE_TYPES`) |
| Polling | `telegram/runner/polling.ts` (`API_CONSTANTS.ALL_UPDATE_TYPES`) |
| Production startup | `ALL_UPDATE_TYPES` in `scripts/start-production.mjs` (hand-maintained, kept in sync by `scripts/start-production.test.ts`) |

If you ever register the main webhook by other means, re-run `pnpm set-webhook` so the update subscription includes `managed_bot`.

### Live test checklist

Run this before calling the flow production-ready, using a **fresh disposable Telegram test account** and a disposable clone name/username — not your own account, and not a clone you care about.

- [ ] Telegram client version used for the test (platform + build).
- [ ] `/clone` in a private chat with the main bot shows the **Create bot in Telegram** URL button.
- [ ] Tapping it opens Telegram's managed-bot creation flow with the main bot as manager.
- [ ] Creation confirmed in Telegram; record the created clone's **bot ID** (the numeric ID, never the token).
- [ ] Main bot's reply captured: it should name the clone's username and include a working link.
- [ ] Clone webhook registered automatically — no "Set Webhook" button appeared, and the clone answers a message.
- [ ] `/clone <token>` with a BotFather token still connects a bot as before.
- [ ] Nothing in the notes, screenshots, or issue contains a bot token.

Record only the client version, bot ID, the user-visible reply, and the webhook outcome.

**Verification status:** the Telegram managed-bot flow and the BotFather permission requirement are taken from Telegram's documented behavior (see [the research note](docs/research/hermes-managed-bot-clone.md) and [issue #3](https://github.com/M4ss1ck/aio-tg-bot/issues/3)). No live managed-bot creation has been performed yet, so client compatibility and the main bot's manager permission are still unverified implementation-time checks.
