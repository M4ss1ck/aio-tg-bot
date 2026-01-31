# All-in-one Telegram bot

> "One bot to rule them all"

This is what you get when you combine [Bot Manager](https://github.com/M4ss1ck/bot-manager) with [MassickBot v2](https://github.com/M4ss1ck/tg-telegraf-bot)

Full-featured constantly-evolving Telegram bot with WebApp support and a `/clone` command to allow users to have their own copy.

## Stack

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [grammY](https://grammy.dev/) - Modern Telegram Bot framework
- [Prisma](https://www.prisma.io/)
- [Redis](https://redis.io/) - Session storage (optional)

## Features

- TypeScript with ESM modules.
- Next.js (and all it brings) for the WebApp.
- Tailwind CSS for styling.
- grammY with plugins (hydrate, parse-mode, runner).
- Polling mode for development, webhooks for production.
- Redis session storage with in-memory fallback.
- Prisma ORM with PostgreSQL database.
- i18next for internationalization (en/es).

## Development

### Environment Variables

Create a `.env` file with the following variables:

```env
TOKEN=your_telegram_bot_token
NEXT_PUBLIC_DOMAIN=your_webhook_domain
ADMIN_ID=your_telegram_user_id
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379  # Optional - falls back to in-memory
VICTIM_ID=123456789               # Optional - for /tag command
```

### Redis Setup (Optional)

For persistent sessions across restarts, run Redis locally with Docker:

```bash
# Start Redis container
docker run -d --name redis-bot -p 6379:6379 redis:alpine

# Verify it's running
docker ps

# Stop when done
docker stop redis-bot

# Start again later
docker start redis-bot
```

If `REDIS_URL` is not set, the bot will use in-memory session storage (sessions are lost on restart).

### Running the Bot

```bash
# Install dependencies
pnpm install

# Generate Prisma client and push schema
pnpm prisma

# Development (polling mode - no webhook needed)
pnpm dev

# Development with Next.js (webhook mode)
pnpm dev:next
```

### Webhook Setup

`webhook.js` can set the webhook for the bot. It's automatically run with `yarn dev:next`, or manually with:

```bash
pnpm set-webhook
```
