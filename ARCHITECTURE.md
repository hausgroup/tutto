# Haus POS — Architecture

## Overview

Haus is a single Next.js application that owns UI, server logic, and integration orchestration. Persistent state lives in Supabase PostgreSQL. External billing/accounting flows through a dedicated **Siigo service layer** that is asynchronous and failure-tolerant.

```
Browser / Staff devices
        ↓
Next.js (RSC, Server Actions, Route Handlers)
        ↓
Supabase PostgreSQL + Auth + RLS
        ↓
Siigo Nube (async sync jobs)
```

## Tenancy model

Even for a single location deployment, all restaurant data is scoped by `restaurant_id`:

- `businesses` — legal/business entity
- `restaurants` — operational location
- `restaurant_memberships` — user ↔ restaurant ↔ role

Shared catalog or cross-location reporting can be added without rewriting core tables.

## Authentication

- **Supabase Auth** for identity (email/password initially).
- `profiles` mirrors `auth.users` via trigger.
- Session refresh runs in **`src/proxy.ts`** (Next.js 16 proxy convention).

## Authorization

Roles and permissions are normalized:

- `roles` (`admin`, `staff`, extensible)
- `permissions` (fine-grained slugs)
- `role_permissions`
- `restaurant_memberships` assigns a role per restaurant

Server helpers:

- `getAuthContext()` — user + memberships + permission slugs
- `requirePermission()` — throws `FORBIDDEN` when missing

Database helpers (RLS):

- `is_restaurant_member(restaurant_id)`
- `user_has_permission(restaurant_id, permission_slug)`

**Rule:** every sensitive mutation must pass RLS **and** server-side authorization.

## Financial integrity

- Store money as **`bigint` minor units** (COP pesos without decimals in UI).
- Use `src/lib/utils/money.ts` for formatting and tax helpers — not raw floats.
- Never hard-delete orders, payments, or inventory movements — use voids, reversals, and audit logs (tables added incrementally in later phases).

## Siigo integration (design)

All Siigo access stays under `src/lib/siigo/*` (server-only).

Internal POS state is **decoupled** from Siigo sync state:

| Domain state   | Example        |
| -------------- | -------------- |
| Order/payment  | `completed`    |
| Siigo sync     | `pending → synced / failed` |

`siigo_sync_jobs` stores idempotent operations with `idempotency_key`, retry counters, and `external_id` when known.

**Never** block completing a sale on Siigo availability.

## Printing (design)

Business logic calls `src/lib/printing/*` adapters:

```
POS → Print Service → Printer Adapter → Device
```

Supports browser, network, and ESC/POS targets without coupling domain code to hardware.

## Offline-ready direction

Phase 1 keeps operations online but structures data for future:

- Explicit payment/sync states
- Async Siigo jobs
- Immutable inventory movement model (Phase 4)

Future: IndexedDB queues + PWA without rewriting order/payment tables.

## Database migrations

SQL files live in `database/migrations/`. **Never** mutate production schema manually — add a new migration.

Initial migration includes:

- Tenancy + auth profile
- Roles/permissions/memberships
- Floor/table stubs
- Product/payment method stubs
- `siigo_sync_jobs`, `audit_logs`
- RLS policies

## Error handling

- User-facing messages are safe and actionable.
- Technical details go to logs / `last_error` on sync jobs.
- Duplicate submissions prevented in UI for financial actions (expanded in POS phase).

## Testing strategy

Vitest covers critical pure logic first:

- Money/tax calculations
- Permission helpers

Expand to order totals, cashier settlement, and Siigo idempotency as features land.

## Deployment

- **Vercel** — Next.js app + environment secrets
- **Supabase** — database, auth, RLS
- Configure auth redirect URL: `{ORIGIN}/auth/callback`

## Phase roadmap

See README and AGENTS.md. Phase 1 stops before POS/table editor UI; schema anticipates Phases 2–10 without premature microservices or extra backends.
