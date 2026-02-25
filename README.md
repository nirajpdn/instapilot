# Instagram Comment Manager (MVP Scaffold)

Next.js full-stack scaffold for a multi-account Instagram comment manager with:

- server-managed encrypted sessions
- account dashboard stubs
- comment job creation across all active accounts
- BullMQ worker scaffold
- OpenAI unique comment generation integration point
- Playwright automation placeholders
- Tailwind CSS v4 dashboard UI

## Setup

1. Install dependencies: `npm install`
2. Copy env file: `cp .env.example .env`
3. Fill required env values (`DATABASE_URL`, `REDIS_URL`, `SESSION_ENCRYPTION_KEY_BASE64`, `OPENAI_API_KEY`)
4. Set admin auth env values (`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`)
5. Run Prisma:
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
6. Start web app: `npm run dev`
7. Start worker in another terminal: `npm run worker`

## What is implemented now

- Prisma schema for accounts/jobs/targets/logs
- Dashboard pages (`/accounts`, `/commenter`, `/jobs`, `/jobs/[id]`)
- API routes for listing accounts, creating comment jobs, fetching job details
- Queue + worker skeleton
- Live Playwright session validation using stored cookies
- Playwright comment posting routine with selector fallbacks and randomized delays
- Dashboard connect flow using pasted Playwright `storageState` JSON

## What is still incomplete (production hardening)

- Robust selector maintenance for Instagram UI changes
- End-to-end testing against real Instagram flows
- Monitoring/alerts and richer operational dashboards
- Additional safety controls (daily caps, account rotation policies, content moderation gates)

## Current connection flow (MVP)

Preferred:
1. Open `/accounts`
2. Enter the Instagram username (and optional display name)
3. Click `Start Browser Login`
4. Log in to Instagram in the opened Playwright browser window
5. Click `Complete Login` in the dashboard

Fallback:
1. Run `npm run connect:export-session`
2. Log in to the Instagram account in the opened browser
3. Press Enter in the terminal
4. Copy the printed `storageState` JSON
5. Paste it into `/accounts`

## Implemented MVP status

- Multi-account connect/disconnect dashboard with server-managed encrypted sessions
- Live session validation (Playwright)
- Comment jobs across all active accounts
- Unique LLM-generated comments per account
- Per-account throttle settings (jitter + cooldown)
- Worker automation with pause/resume/cancel controls
- Dry-run mode
- Activity logs + failure screenshots
- Live job detail updates (SSE)
- Admin auth protection for pages and APIs

## Notes

- UI styling uses Tailwind CSS v4 via `@import "tailwindcss"` in `/app/globals.css`.
- Set `PLAYWRIGHT_HEADLESS=false` in `.env` if you want browser windows visible during worker runs.
- Instagram UI can change frequently; selectors may need updates.
- Failure screenshots are saved under `artifacts/screenshots/` and referenced in job target logs.
- Dashboard and APIs are protected by admin login at `/login`.
- Each account has configurable throttle settings in `/accounts`:
  - `Min Delay` / `Max Delay` (ms): randomized pre-post jitter
  - `Cooldown` (sec): minimum time between comments for that account
- `/jobs/[id]` uses SSE (`/api/jobs/:id/events`) to auto-refresh job targets and logs.
- `/jobs/[id]` includes job controls: `Pause`, `Resume`, `Cancel`.
- `/commenter` supports `Dry run` mode (generates comments and logs, skips Instagram posting).
- Failure screenshots in logs can be previewed inline and opened via `/api/artifacts/screenshot`.

## After schema changes

If you pull new code after changes to `prisma/schema.prisma`, run:

- `npm run prisma:generate`
- `npm run prisma:migrate`
   - includes Tailwind CSS v4 (`tailwindcss` + `@tailwindcss/postcss`)
