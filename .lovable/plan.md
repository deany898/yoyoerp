# Mobile-First PWA + Activate All Features

The app is already UI-complete (all 28 PRDs ship in demo mode against an in-memory store). This plan does two things in parallel tracks:

- **Track A (Phase 0):** Make Stackwise installable on phones with a mobile-first manifest.
- **Track B (Phases 1–6):** Migrate each feature area from the in-memory `DemoStore` to the real Lovable Cloud database, behind a single data-source abstraction so demo mode keeps working.

After every phase the app remains fully usable. Demo mode is preserved end-to-end.

---

## Track A · Phase 0: Mobile-first installable app (manifest-only)

Ship a Web App Manifest so users can "Add to Home Screen" on iOS and Android with a native-feeling launch (standalone window, branded icon, splash). **No service worker** — that avoids the preview-iframe staleness trap. Offline support can be added later as an opt-in phase.

What gets built:
- `public/manifest.webmanifest` with `display: standalone`, theme colors pulled from `src/styles.css` (matte ceramic / teal-emerald primary), `start_url: "/app/dashboard"`, scope `/`.
- App icons (192, 384, 512, maskable 512) + Apple touch icon, generated from a Stackwise mark.
- `<link rel="manifest">`, `apple-mobile-web-app-*` meta, `theme-color` meta wired into `src/routes/__root.tsx`.
- Mobile-first audit pass on the auth page and dashboard for safe-area insets and tap targets ≥ 44px.

Verified by: opening the published URL on a phone → "Add to Home Screen" → app launches standalone with branded icon and splash.

---

## Track B · Backend migration overview

A single data-access layer wraps both the existing `DemoStore` and a new Supabase-backed store. Components keep using the same hooks (`useInventoryData`, `useInventoryMutations`, etc.) — the hook picks the source based on `useDemo().isDemo`. This means migration is incremental, reversible, and never breaks demo mode.

```text
Component
   │
   ▼
useInventoryData / useInventoryMutations
   │
   ├── isDemo? ──► DemoStore (in-memory, unchanged)
   │
   └── else  ───► supabaseStore (new, per-feature)
```

---

## Phase 1 · Identity, roles, and a real account

Goal: real users can sign in, have a role, and see correct UI everywhere.

- Promote-first-user-to-admin bootstrap (one-time): a server function that grants `admin` role to the very first signup so you have a way in.
- Wire `useRole()` to read from the new `user_roles` table (already created) when not in demo mode; keep demo role-switcher for demo only.
- Real-auth user-management page (PRD-23): list users from `auth.users` via a server function, change roles, deactivate. Admin-only.
- Add a "Workspaces" concept? **No** — single-tenant per project for now (simpler RLS, can add multi-tenant later).

---

## Phase 2 · Catalog foundation (core data)

Goal: real items, categories, suppliers, locations persist and respect RLS.

Tables (using your existing `docs/migrations/` schema as reference):
- `categories`, `suppliers`, `locations` (with parent-child for location tree)
- `items` (SKU, name, qty, reorder point, category/supplier/location FKs, custom_fields JSONB)
- `custom_field_definitions`

RLS model: signed-in users in any role can read; only admin/manager can write.

UI rewires (PRDs 07, 08, 10, 14, 22):
- Catalog list, item detail sheet, item form, bulk actions, custom-fields tab
- Suppliers table + detail + form
- Locations tree + transfer
- Settings → Categories, Custom Fields, Reorder Defaults

Seed: optional "Load sample data" button on first sign-in (admin-only) that inserts the same seed data the demo uses.

---

## Phase 3 · Stock movements, requests, and POs

Goal: the operational workflows write to real tables.

Tables:
- `stock_movements` (received / shipped / adjusted / transferred, with FK to item, location, user)
- `purchase_orders` + `purchase_order_lines` (status enum: draft / sent / received / closed)
- `inventory_requests` + `inventory_request_lines` (status enum, approval audit fields)

UI rewires (PRDs 09, 11, 12, 13):
- Movements page + filters + new-movement sheet
- POs list, form, detail, status actions, receive-shipment flow, print view
- Requests list, form, approval actions, status stepper

Business rules in DB:
- Trigger: when a PO line is received, insert a corresponding `stock_movement` and bump `items.current_stock`.
- Trigger: when a request is fulfilled, insert a `shipped` movement.
- Constraint: prevent negative stock on `shipped` adjustments.

---

## Phase 4 · Notifications + dashboard + analytics

Goal: real-time alerts and reporting against live data.

- `notifications` table + RLS (user can only see their own); Supabase Realtime subscription powers the bell.
- `notification_preferences` per user.
- A scheduled `pg_cron` job (every 15 min) that runs the existing `useStockAlertGenerator` logic in SQL and inserts low-stock notifications for users who opted in.
- Dashboard metrics, charts, recent activity all read from real tables.
- Analytics pages (PRDs 24–25): supplier scorecards, cost trends, turnover — implemented as SQL views or `createServerFn` aggregates.

---

## Phase 5 · AI features (real backend)

Goal: AI insights run via Lovable AI Gateway, not mock data.

- Reorder suggestions (PRD-19): server function that pulls real movement history and asks `google/gemini-2.5-flash` for forecasts; cache results in a `reorder_forecasts` table with a 24h TTL.
- Anomaly detection (PRD-20): same pattern, surfaces in the dashboard anomaly section.
- NL search (PRD-20): server function translates natural language → filter object using Gemini, then runs the structured query.

No API key needed — uses the built-in `LOVABLE_API_KEY` already in your secrets.

---

## Phase 6 · CSV / barcode / command palette / onboarding (polish)

Goal: utility features connect to real data.

- CSV export pulls from real tables; CSV import opens a server function that validates + bulk-inserts (PRD-16).
- Barcode generation/print already client-side — no DB change, but quick-entry mode now writes a real movement.
- Command palette (PRD-17): search hits real items via a `createServerFn` with `ilike` query.
- Onboarding tour (PRD-28): unchanged, but the "Try the demo" CTA on the auth page already bridges new users into demo mode.

---

## Cross-cutting items

- **Email confirmation:** currently ON (default secure setting). For phase 1, recommend keeping it on; if you want frictionless testing, we can disable it.
- **Storage:** add a `storage` bucket for item photos and PO attachments in Phase 2 (RLS: only signed-in users can upload to their org's prefix).
- **Removing demo mode later:** out of scope. Demo mode stays as the marketing surface.

---

## Technical details (for reference)

- Data-access pattern: each feature gets a `lib/data/<feature>.ts` exporting the same shape, with `getStore(isDemo)` returning the right backend.
- All new tables use the existing `update_updated_at_column` trigger and `has_role(auth.uid(), …)` for write policies.
- Server functions live in `src/server/<feature>.functions.ts`, server-only helpers in `src/server/<feature>.server.ts`.
- Realtime: per `docs/migrations/`, add tables to `supabase_realtime` publication only where the UI subscribes (notifications, stock movements).
- PWA: manifest-only in Phase 0; if/when a service worker is added later, it must be guarded by `isPreviewHost || isInIframe` and use `NetworkFirst` for HTML.

---

## Suggested cadence

Phase 0 + Phase 1 in the next message (small, high-value, unblocks everything). Then one phase per message so you can review and test each before moving on. Total: ~7 implementation messages.

Two questions before I start (the rest I'll just decide based on your existing patterns):

1. **PWA scope:** manifest-only (recommended) or full PWA with offline support (complex, risk of stale previews)?
2. **Email confirmation:** keep ON (secure default) or turn OFF so you can test signup → app instantly?
