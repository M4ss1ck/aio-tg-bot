# All-in-one Telegram bot

> "One bot to rule them all"

This is what you get when you combine [Bot Manager](https://github.com/M4ss1ck/bot-manager) with [MassickBot v2](https://github.com/M4ss1ck/tg-telegraf-bot)

Full-featured constantly-evolving Telegraf bot with WebApp support and a `/clone` command to allow users to have their own copy.

## Stack

- [NextJS](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Telegraf](https://github.com/telegraf/telegraf)
- [Prisma](https://www.prisma.io/)

## Features

- Typescript.
- NextJS (and all it brings) for the WebApp.
- Tailwind CSS for styling.
- Telegraf.
- Webhook powered bots (more speed, better performance).
- Prisma (ORM)
- PostgreSQL database.

## Development

You'll need a few environment variables to run this bot

- `TOKEN` for the token of the Telegram bot
- `NEXT_PUBLIC_DOMAIN` for webhook domain
- `ADMIN_ID` is the Telegram ID of the bot owner.
- `DATABASE_URL` is the url of the portgresql database.
- `VICTIM_ID` _(Optional)_ is the Telegram ID of the user that will be victim of all those `/tag` commands.

`webhook.js` file can set webhook for our bot, you can call it manually with `yarn set-webhook`. It's automatically run in development with `yarn dev` too.
