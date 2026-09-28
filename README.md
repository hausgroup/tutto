# Haus POS

Modern restaurant point-of-sale for Colombia — floor management, inventory, cashier operations, reporting, receipt printing, and **Siigo Nube** integration.

## Stack

- **App:** Next.js (App Router), React, TypeScript
- **UI:** Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/), Lucide
- **Backend:** Next.js server actions / route handlers
- **Database:** Supabase (PostgreSQL, Auth, RLS)
- **Validation:** Zod
- **Hosting target:** Vercel + Supabase + GitHub

## Prerequisites

- Node.js 20+
- A Supabase project (free tier is fine for development)

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy the example file and fill in your Supabase credentials:

   ```bash
   cp .env.example .env.local
   ```

   Required for auth and database access:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Optional (server-only, never expose to the browser):

   - `SUPABASE_SERVICE_ROLE_KEY` — invitaciones de personal y scripts admin
   - `SIIGO_USERNAME`, `SIIGO_ACCESS_KEY`, `SIIGO_PARTNER_ID` — Siigo integration (Phase 8)

3. **Database**

   In the Supabase SQL editor (or via Supabase CLI), run:

   1. `database/migrations/20250924000000_initial_schema.sql`
   2. `database/migrations/20250924100000_catalog_inventory_orders.sql`
   3. `database/migrations/20250924110000_pos_supabase_helpers.sql`
   4. `database/migrations/20250924120000_staff_module.sql`
   5. `database/seed.sql`
   6. `database/seed-phase3-9.sql` (catálogo, recetas, inventario demo)

4. **First admin user**

   1. Create a user in **Supabase Auth** (email + password).
   2. The `on_auth_user_created` trigger creates a `profiles` row.
   3. Link the user to the demo restaurant:

      ```sql
      insert into public.restaurant_memberships (restaurant_id, user_id, role_id)
      select
        '22222222-2222-4222-8222-222222222222',
        '<YOUR_AUTH_USER_UUID>',
        id
      from public.roles
      where slug = 'admin';
      ```

5. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/login` until authenticated.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Development server       |
| `npm run build`| Production build         |
| `npm run start`| Production server        |
| `npm run lint` | ESLint                   |
| `npm test`     | Unit tests (Vitest)      |

## Project structure

```
src/app/              Routes (auth, dashboard shell)
src/components/       UI and layout
src/lib/              Domain services (auth, supabase, siigo, printing, money)
src/schemas/          Zod schemas
src/types/            Shared TypeScript types
database/migrations/  SQL migrations
database/seed.sql     Development seed data
```

## Security notes

- Siigo and service-role credentials are **server-only**.
- Authorization is enforced with **Supabase RLS** and server-side checks — UI hiding is not security.
- Monetary values use **integer minor units** (COP) in the schema and utilities.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design and business rules
- [AGENTS.md](./AGENTS.md) — AI development guidelines for this repo

## Current phase

**Phases 2–9 — operativo en demo y con Supabase (catálogo, pedidos, caja, reportes)**

| Área | Ruta | Estado |
| ---- | ---- | ------ |
| Salón y plano | `/floor`, `/floor/editor` | Supabase + demo |
| Catálogo | `/products` | Supabase + demo |
| Inventario y recetas | `/inventory`, `/recipes` | Supabase + demo |
| POS móvil | `/pos/[tableId]` (desde mesa en salón) | Supabase + demo |
| Caja | `/cashier` | Supabase + demo |
| Reportes | `/reports` | Supabase + demo |
| Siigo / impresión | Tras cobrar | Cola en `siigo_sync_jobs` (worker pendiente) |
| Personal | `/staff` | Supabase + demo |

**Flujo demo:** `HAUS_DEMO_MODE=true` → login → salón → **Abrir POS** en una mesa → productos → enviar → cobrar → reportes / inventario (consumo por receta).

**Pendiente:** worker Siigo, impresión física.

### Demo mode (without Supabase)

1. Create `.env.local` with `HAUS_DEMO_MODE=true` (Supabase vars optional).
2. `npm run dev` → **Entrar en modo demo**.

In-memory data resets on server restart. With Supabase, run both migrations and both seed files, link admin membership, then wire domain services to PostgreSQL.
# tutto
