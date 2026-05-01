## What you asked for

1. Move the **Permission matrix** out of Admin → Presets and into **User management**.
2. Show the **role-permission matrix** (the read-only summary) below the User management page.
3. Fix the **"Access denied" on Audit log** — admins/managers can't open it.
4. Remove the **in-page tab bar** under `/app/admin` (System / Presets / Inventory / Audit). Navigation only happens from the left sidebar.
5. Remove **User management** from the sidebar's Contacts group (it's already in Admin).
6. **Production logs and Work logs are duplicates** → delete Production logs (`/app/manufacturing` list) and keep only **Work logs**. (The MO detail page `/app/manufacturing/$moId` stays as a deep-link target if Work logs link to it.)
7. **Utilities:** when adding a utility, pick a warehouse + utility kind. The *effective monthly cost* used downstream becomes a **30-day rolling average** of that utility for that warehouse.
8. **Worker pay used in costing** also becomes a **30-day rolling average** (salary or wage logged in work-logs over the trailing 30 days, divided by 30).
9. **Machines:** the "Type" field is already a free-text dropdown that remembers prior types — confirmed working, but I'll harden it. New behaviour: when a machine has type `moulding`, the warehouse's utility cost is split **equally between all moulding machines in that warehouse** instead of by `usage_volume`. Non-moulding types keep using `usage_volume` share.
10. **Categories:** drag-and-drop reordering, plus drag a category onto another to make it a **subcategory** (sets `parent_id`).

## How it will be built

### Sidebar / navigation cleanup
- `src/components/layout/Sidebar.tsx`
  - Remove `User management` entry from the `Contacts` group (kept under `Admin`).
  - Keep the rest as is.
- `src/routes/app.admin.tsx`
  - Remove the in-page tab `<nav>` bar entirely. The page becomes a thin `<Outlet />` with just a heading.

### Audit log access fix
- `src/routes/app.admin.audit.tsx`
  - Replace the `cap("settings.view")` gate with a role-based gate (`role === 'admin' || role === 'manager'`), matching the parent `/app/admin` guard. This is what's blocking the user today.

### Permissions move (Presets → User management)
- `src/routes/app.admin.presets.tsx` — remove `<PermissionMatrix />`.
- `src/routes/app.users.tsx` — add a new section below the existing user list that renders `<PermissionMatrix />` (the editable role-defaults + per-user override matrix). The existing static "Role · permission matrix" reference table stays as the read-only summary below it.

### Production logs ≡ Work logs
- Delete route `src/routes/app.manufacturing.tsx` (the list page). Keep `src/routes/app.manufacturing.$moId.tsx` so existing MO links still work.
- Remove `Production logs` link from sidebar's Manufacturing group.
- Update `src/lib/role-nav.ts` to drop `/app/manufacturing` from role allow-lists (the `$moId` deep link still resolves under the prefix).
- Update `src/components/command/palette-pages.tsx` and `src/lib/route-meta.ts` to drop the production-logs entry.

### Utilities — 30-day average + downstream costing
- `src/routes/app.utilities.tsx`
  - Add a "Last 30 days" summary card per warehouse showing average daily/monthly utility cost (sum of utility entries whose `period_month` falls in last 30 days, normalized to 30-day window).
- `src/server/costing.functions.ts` (and any helper that derives machine effective hourly rate)
  - Replace the current "latest month utility" lookup with a **30-day rolling average** query: `sum(amount) where period_month >= today - 30 days`, divided by 30 (per-day) or 1 (per-month) as needed.
- Worker pay basis (used inside costing for stage labour):
  - Pull `payroll_ledger_entries` for the worker over the last 30 days, sum amounts, divide by 30 → daily rate. If no ledger entries, fall back to `payroll_config` declared rate.

### Machines — moulding-aware utility split
- `src/server/costing.functions.ts`
  - In the helper that allocates warehouse utility to machines:
    - Compute the warehouse's 30-day average utility cost.
    - Group machines in that warehouse by `type`.
    - For machines with `type ILIKE 'moulding%'`, split the **moulding share** of utility equally across them (count-based).
    - For other machines, keep the existing `usage_volume`-weighted split.
    - Effective hourly rate = (allocated utility / working hours per month) + machine pay/labour share.
- Type input on `app.machines.tsx` already uses `SmartSelect` with `onCreate` for free-text + memory of past types — verify and keep.

### Categories — drag and drop
- Replace `src/components/settings/CategoryManager.tsx` with a tree view using **dnd-kit** (already common in shadcn projects; will `bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` if not present).
  - Render categories as a nested tree based on `parent_id`.
  - Drag-reorder within a parent: updates `sort_order`.
  - Drag onto another category: sets that category's `parent_id` to the drop target.
  - Drag to root drop zone: clears `parent_id`.
  - Inline rename + add child remain available.
- Add a `useUpdateCategory` mutation call already exists; extend the Supabase update to accept `parent_id` and `sort_order`.
- Page header on `/app/categories` updated with a short "Drag rows to reorder · drop on a row to nest" hint.

### Files touched
- Edited: `src/components/layout/Sidebar.tsx`, `src/routes/app.admin.tsx`, `src/routes/app.admin.audit.tsx`, `src/routes/app.admin.presets.tsx`, `src/routes/app.users.tsx`, `src/routes/app.utilities.tsx`, `src/routes/app.machines.tsx`, `src/server/costing.functions.ts`, `src/lib/role-nav.ts`, `src/lib/route-meta.ts`, `src/components/command/palette-pages.tsx`, `src/components/settings/CategoryManager.tsx`.
- Deleted: `src/routes/app.manufacturing.tsx` (list).
- New: none.

## Out of scope (ask if you want them)
- Renaming the Manufacturing sidebar group — leaving as is, just dropping the duplicate item.
- Migrating the `production_stages` data model — only the route/UI duplicate is removed.