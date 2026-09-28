<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Haus POS — AI development rules

Read **ARCHITECTURE.md** and **README.md** before structural changes.

## Stack (do not deviate without strong reason)

Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase (Auth + Postgres + RLS), Zod, React Hook Form for complex forms. Host on Vercel. No separate Express/Nest backend.

## Architecture boundaries

- Business logic in `src/lib/*` services — not in UI components.
- Siigo only via `src/lib/siigo/*` (server-only). Never import Siigo from client/components.
- Printing via `src/lib/printing/*`.
- Money in minor integer units; use `src/lib/utils/money.ts`.
- POS completion must not depend on Siigo being online; use `siigo_sync_jobs` async sync.

## Security

- Never expose `SUPABASE_SERVICE_ROLE_KEY` or Siigo credentials to the client.
- Enforce authorization in RLS and server code — not hidden buttons.
- Validate all inputs with Zod on the server.

## Multi-restaurant

Scope restaurant data with `restaurant_id`. Do not assume a single location forever.

## Workflow for new features

1. Inspect existing code; avoid duplicates.
2. Plan DB migration + RLS + permissions.
3. Implement server logic and validation.
4. Implement UI with loading/error states.
5. Add tests for critical financial/business logic.
6. Update docs when architecture changes.

## Phases

Build incrementally per README phase list. **Do not implement the full POS in one pass.** Current foundation ends before table editor / POS screens unless explicitly requested.

## Definition of done

UI + DB + server logic + auth + validation + error/loading states + tests for critical logic + audit where required.
