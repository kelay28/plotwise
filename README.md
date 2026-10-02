# Plotwise

Garden planner built with TanStack Start, React, Tailwind, Supabase and the Claude API.

## Run locally

1. Install [Bun](https://bun.sh).
2. `cp .env.example .env` and fill in the values (see below).
3. `bun install`
4. `bun run dev`, then open the URL it prints.

## One-time setup

- **Supabase** (free): create a project at supabase.com, open SQL Editor, paste all of
  `supabase/setup.sql` and click Run. Copy the project URL and publishable/anon key into `.env`.
  - Auth > URL Configuration: set Site URL to your domain and add `http://localhost:3000/**` to redirect URLs.
  - Google sign-in (optional): Auth > Providers > Google, using a Google Cloud OAuth client.
- **Claude API**: create a key at console.anthropic.com and set `ANTHROPIC_API_KEY`.
- **OpenAI** (optional): `OPENAI_API_KEY` enables AI-generated custom plant icons.

## Deploy

`bun run build` produces a Cloudflare build by default. Deploy to Cloudflare Workers/Pages, set the
same env vars there, then point your domain at it from Squarespace's DNS settings.
