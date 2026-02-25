# Instagram Comment Manager (MVP Scaffold)

Next.js full-stack scaffold for a multi-account Instagram comment manager with:

- server-managed encrypted sessions
- account dashboard stubs
- comment job creation across all active accounts
- BullMQ worker scaffold
- OpenAI unique comment generation integration point
- Playwright automation placeholders

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

## What is still stubbed / incomplete

- In-dashboard Instagram login/connect browser flow (currently use `npm run connect:export-session`)
- Robust selector maintenance for Instagram UI changes
- Failure screenshots and richer anti-rate-limit controls
- Admin auth

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

## Notes

- Set `PLAYWRIGHT_HEADLESS=false` in `.env` if you want browser windows visible during worker runs.
- Instagram UI can change frequently; selectors may need updates.
- Failure screenshots are saved under `artifacts/screenshots/` and referenced in job target logs.
- Dashboard and APIs are protected by admin login at `/login`.
- Each account has configurable throttle settings in `/accounts`:
  - `Min Delay` / `Max Delay` (ms): randomized pre-post jitter
  - `Cooldown` (sec): minimum time between comments for that account
- `/jobs/[id]` uses SSE (`/api/jobs/:id/events`) to auto-refresh job targets and logs.
