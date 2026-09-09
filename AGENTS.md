<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Ruvana

Single-package campus facility reservation app built with Next.js 16 App Router,
React 19, Prisma 7, PostgreSQL 16, Tailwind CSS v4, and pnpm 10.

The repository is still a Fase-0 foundation: `app/` contains only the landing
shell. Read the relevant module in `TASK.md` before implementation. Its acceptance
rules override older Fase-0 notes under `docs/superpowers/`.

## Setup

### Fresh clone

```bash
cp .env.example .env
pnpm install
pnpm prisma generate
```

- `prisma.config.ts` requires `DATABASE_URL`, including during client generation.
- The generated client lives in ignored `generated/prisma`; imports and typechecks
  fail until generation succeeds.

### Standard local development

```bash
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The app runs on port 3000. The seed uses upserts and is safe to rerun. Stop
PostgreSQL with `pnpm db:down`.

### Rootless Podman on `/mnt/DATA`

Do not use `pnpm db:up` on this machine. Use the local compose override:

```bash
podman-compose -f docker-compose.local.yml up -d
pnpm db:migrate
pnpm db:seed
```

Its PostgreSQL data is stored on tmpfs. Re-run migration and seed after every
container recreation. Stop it with:

```bash
podman-compose -f docker-compose.local.yml down
```

## Verification

Match CI's required order:

```bash
pnpm prisma generate
pnpm lint
pnpm check:banned
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm build
```

- `next typegen` must precede `tsc`; `app/layout.tsx` uses generated `LayoutProps`.
- `pnpm build` regenerates Prisma Client but does not replace the explicit typecheck.
- There is currently no test framework or test suite.
- CI uses Node 22, pnpm 10.30.2, and `pnpm install --frozen-lockfile`.
- Husky checks staged files with `scripts/check-banned-words.sh --staged`;
  `pnpm check:banned` scans the repository.

## Architecture

Preserve M/C/V separation without creating a `/views` directory:

- **Model:** `prisma/schema.prisma`, migrations, and `lib/prisma.ts`.
- **Controller:** Server Actions and route handlers under `app/`, plus business
  services under `lib/`.
- **View:** `components/` plus page and layout rendering. Views must not query
  Prisma or contain business rules.

Application code must use the singleton from `lib/prisma.ts`. Import generated
Prisma types from `generated/prisma`, never directly from `@prisma/client`.

## Domain rules

- Keep business values in `config/business.ts`; do not hardcode them in UI or
  services. Keep its status lists synchronized with `prisma/schema.prisma`.
- Status values are English. Roles, facility types, user-facing domain labels,
  comments, and commit messages are Indonesian.
- Reservations use 30-minute slots from 07:00 through 20:00.
- Validate time, past dates, facility state, and overlap on the server. Important
  forms must also validate client-side.
- `PENDING` reservations may overlap. Only `APPROVED` reservations block a slot;
  approval must perform a final conflict check.
- A transition to `UNDER_MAINTENANCE` cancels future `APPROVED` reservations through
  `lib/facility-status-contract.ts` (Module 4 trigger, Module 3 listener). Do not
  inline this cross-module behavior.

## Prisma and deployment

- This project uses Prisma 7's `prisma-client` generator with explicit output,
  `PrismaPg`, and dotenv-loaded `prisma.config.ts`. Do not follow old
  `prisma-client-js` examples.
- PostgreSQL CHECK constraints use manual SQL. Create one with
  `pnpm prisma migrate dev --create-only`, edit the generated SQL, then apply it.
  Existing slot checks are in `20260903150549_add_check_constraints_pg`.
- Production schema changes use `pnpm prisma migrate deploy`, never `migrate dev`.
- Vercel auto-deployment is enabled only for `main` in `vercel.json`.

## Repository gotchas

- PDFs, `generated/`, and local compose overrides are ignored and may not appear
  in normal `git status`.
- Most of `docs/` is local-only. The tracked exceptions are `docs/PRD.md`,
  `docs/DESIGN.md`, `docs/superpowers/DECISION.md`, and `docs/api/openapi.yaml`.
- Never commit `.env` or local database credentials.
