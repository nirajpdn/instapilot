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
4. Run Prisma:
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
5. Start web app: `npm run dev`
6. Start worker in another terminal: `npm run worker`

## What is implemented now

- Prisma schema for accounts/jobs/targets/logs
- Dashboard pages (`/accounts`, `/commenter`, `/jobs`, `/jobs/[id]`)
- API routes for listing accounts, creating comment jobs, fetching job details
- Queue + worker skeleton

## What is still stubbed

- Instagram login/connect flow (Playwright)
- Session validation with Instagram
- Actual comment posting automation
- Admin auth
