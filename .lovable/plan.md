
# YOYO ERP V2 · Private Industrial Command Center

The full scope you described is roughly 9–10 engineering passes. Trying to build it all at once produces shallow stubs everywhere. Per your answer, we go **Foundation first** and ship each phase fully working before moving on.

This plan covers **Phase 1 only** (the next pass). Subsequent phases are listed at the end so you can see the road, but they are NOT being built now.

---

## Phase 1 · Foundation (this pass)

### 1A · Permissions governance (fixed 7 roles + per-user overrides)

One migration:

- `permission_capability` enum · ~50 capabilities covering every module:
  `view`, `create`, `edit`, `delete`, `approve`, `export`, `import`, `bulk_edit` per module (products, customers, suppliers, inventory, movements, manufacturing, dispatch, returns, purchase orders, payroll, work logs, analytics, settings, users) plus financial-visibility flags (`view_costs`, `view_margins`, `view_pricing`, `view_payroll`).
- `role_permissions` table · default capability matrix per app_role · admin can edit at runtime to globally widen/narrow a role.
- `user_permission_overrides` table · `(user_id, capability, granted boolean, reason, granted_by, expires_at)` · admin can grant or revoke a single capability for a single user without changing their role.
- `has_capability(_user_id, _cap)` SECURITY DEFINER function · checks override first, then role default. All RLS policies and the React `usePermissions` hook get rewired to call this.
- `audit_log` rows for every grant/revoke (already exists).

Admin UI (`/app/settings/permissions`):
- Matrix view · roles × capabilities with toggle switches.
- Per-user overrides tab · search a user, see effective permissions, grant/revoke individual capabilities with expiry.
- All changes are admin-only and audit-logged.

### 1B · Live "View as role" simulator

- Admin-only floating switcher (top-right) that overrides the effective role for the current session in the browser only.
- Affects sidebar visibility, route guards, capability checks · does NOT change DB role · server-side RLS still enforces real role (so admin can simulate but cannot escalate other users).
- Banner: "Viewing as Worker · Click to exit". One-click reset.

### 1C · Global search engine (server-side, role-aware)

- New server function `globalSearch({ query, scope?, limit })` (`createServerFn`) running under `requireSupabaseAuth`.
- Searches across: products, variants, customers, suppliers, dispatch orders (DO#), purchase orders (PO#), manufacturing orders (MO#), goods returns (GR#), inventory movements, warehouses, zones, machines, moulds, workers, work logs, payroll runs, settings pages, and reports.
- Each table queried with ILIKE on its meaningful columns, results ranked by recency · capped per entity type to keep latency low (<200ms typical).
- **Authorization:** every result passes through `has_capability(user, "<entity>.view")` before being returned. Customers see nothing internal. Workers see only production/inventory entities. Sales sees customers + orders but not payroll. Admin sees everything.
- New Cmd+K palette page extending current `CommandPalette` · grouped results, recent searches stored in `user_search_history` (per-user, last 50), keyboard navigation, deep-link to entity detail.
- Mobile: search button in `BottomNav` opens full-screen search sheet.

### 1D · Audit log surfacing

- New `/app/settings/audit` page (admin only) · paginated table of `audit_log` rows with filters by actor, action, table, date range, and free-text on `notes`.
- "Last 5 major actions" widget on user profile page.
- Already-existing `audit_log` table is used as-is (it has the right columns).

### 1E · OTP-based login (email channel)

- Add Email OTP option to `/auth` page alongside existing email+password and Google.
- Uses Supabase `signInWithOtp()` · 6-digit code emailed via the existing Lovable Cloud auth-email pipeline.
- UI: tabbed login form · "Password" / "OTP" / "Google".
- Phone/WhatsApp OTP deferred · adds a "Coming soon" placeholder with a note that admin can enable later via SMS connector.

### 1F · PWA install polish

PWA scope confirmed = installable only (no service worker). What we actually do:
- Verify `/manifest.webmanifest` has correct `name`, `short_name`, `theme_color`, `background_color`, all icon sizes (192, 512, maskable).
- Add iOS install meta tags (`apple-mobile-web-app-capable`, `apple-touch-icon`, status bar style) in `__root.tsx` head.
- Add a one-time install prompt banner for Android Chrome (`beforeinstallprompt`) and an iOS-specific "Add to Home Screen" hint.
- No service worker · no offline · no background sync (per your choice).

### Files (Phase 1)

```text
supabase/migrations/
  20260501_permissions_governance.sql    new (capabilities, role_permissions, user_permission_overrides, has_capability, search_history)

src/server/
  permissions.functions.ts                new · grant/revoke/list capabilities (admin only)
  global-search.functions.ts              new · authorized search across all entities
  audit.functions.ts                      new · paged audit log query (admin only)

src/lib/
  capabilities.ts                         new · capability constants + TS types
  capability-matrix.ts                    new · default role → capability map (seed + UI source)

src/hooks/
  usePermissions.tsx                      rewrite · backed by capabilities, supports simulator override
  useGlobalSearch.ts                      new · debounced server query + history

src/contexts/
  RoleSimulatorContext.tsx                new · admin-only "view as" override

src/components/
  command/GlobalSearchPalette.tsx         new · replaces existing CommandPalette content
  layout/RoleSimulatorBar.tsx             new · floating switcher + active banner
  settings/PermissionMatrix.tsx           new · role × capability toggles
  settings/UserOverridesPanel.tsx         new · per-user grant/revoke
  settings/AuditLogTable.tsx              new
  auth/OtpLoginForm.tsx                   new

src/routes/
  app.settings.permissions.tsx            new
  app.settings.audit.tsx                  new
  auth.tsx                                edit · add OTP tab
  __root.tsx                              edit · iOS PWA meta + install banner mount
```

All files stay under the 250-line cap by splitting into atomic components.

### Why this order

Without governance + audit + authorized search, every later phase (analytics, AI assistant, purge tools, blueprint export) would either leak data across roles or get rebuilt twice. RBAC and search are the load-bearing walls.

---

## Phases 2–9 · NOT being built this pass

Listed so you can see the destination, ranked by dependency:

```text
Phase 2 · Customer + Staff Analytics Engine
        - customer_analytics + worker_analytics materialized views
        - admin-only /app/intelligence/customers and /app/intelligence/team
        - tier-movement, churn-risk, productivity, search-behavior

Phase 3 · YOYO Admin AI Assistant (Lovable AI Gemini)
        - /app/ai-assistant chat + scheduled "morning briefing"
        - feeds on analytics views; suggests price moves, dead stock, weak performers

Phase 4 · Data privacy + timeline purge
        - admin-only purge tool with date-range hard delete
        - requires typed confirmation, audit-logged
        - blueprint snapshot taken automatically before any purge

Phase 5 · Blueprint Export / Import
        - admin-only ZIP export of full schema + data + settings
        - import path on a fresh project for migration

Phase 6 · QuickSell / B2B intelligence views
        - dealer segmentation, route optimization, opportunity reports
        - depends on Phase 2 analytics

Phase 7 · Push notifications + advanced PWA
        - only if you later upgrade PWA scope

Phase 8 · SMS / WhatsApp OTP
        - requires Twilio or MSG91 connector (paid)

Phase 9 · Hardening + load test + final polish
```

---

## What you get after this pass

- Admin can grant/revoke any capability per role or per user, live, with audit.
- Admin can simulate any role to verify what every user actually sees.
- Cmd+K (and mobile search button) finds anything in the system the current user is allowed to see · nothing more.
- Every privileged change is in an audit log admin can browse.
- Users can log in with email OTP in addition to password and Google.
- App installs cleanly on iOS, Android, and desktop.

Confirm to proceed and I'll run the migration first, then build the UI + server functions in the same pass.
