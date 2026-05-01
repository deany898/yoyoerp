# Fix: logout broken + role silently downgraded to "worker"

## Diagnosis (verified in code)

Two real bugs, one shared root cause: the app treats "roles not yet loaded" identically to "user has no role," and silently falls back to `"worker"`.

### Bug 1 · Role flips to worker

`src/contexts/RoleContext.tsx` line 35:
```ts
const realRole = ROLE_PRIORITY.find((r) => authRoles.includes(r)) ?? "worker";
```
- `authRoles` is `[]` for the entire window between `user` being set and the `user_roles` query resolving (deferred via `setTimeout`).
- During that window every user — admin included — is rendered as `worker`.
- If the `user_roles` query ever fails (network blip, RLS edge case, deleted assignment), the user is **stuck** as worker forever with no error surfaced.
- Sidebar then hides admin items, route guard kicks them off admin pages → "my role changed to worker."

### Bug 2 · Logout broken

`src/contexts/AuthContext.tsx` `signOut()`:
- Calls `supabase.auth.signOut()` only — no navigation, no error surfacing, no clearing of in-memory state if Supabase rejects.
- After it resolves, `onAuthStateChange` fires → `user = null` → `roles = []` → `realRole` falls back to `worker`.
- `src/routes/app.tsx` has TWO `useEffect`s that race:
  1. role-guard: sees role=worker on `/app/customers`, fires `toast.error("You don't have permission")` and navigates to `/app/dashboard`.
  2. auth-guard: sees `!user`, navigates to `/auth`.
- Whichever wins, the user sees a confusing error toast and often lands back inside `/app` instead of on `/auth`. With the `hasResolvedOnceRef` pin we added last turn, the spinner never re-shows either, so the screen visually "doesn't change" → "logout is not working."

There's also no logout button in the mobile `BottomNav` / mobile menu — only the desktop Sidebar has it. On mobile it genuinely cannot be triggered.

## Fixes

### 1. AuthContext: track role-loading state and surface failures

`src/contexts/AuthContext.tsx`
- Add `rolesLoading: boolean` to `AuthContextValue`. Set true while the profiles+roles query is in flight, false on success **and** on error.
- Add `rolesError: string | null` for diagnostics.
- Stop using `setTimeout(..., 0)` — it just defers without solving anything; call the query directly inside the effect (still cancellable).
- Wrap the queries in try/catch; on error, log + set `rolesError`, but never silently leave `roles` as `[]` forever — keep the previous value if there was one.
- Make `signOut()`:
  - clear local state synchronously (`setUser(null)`, `setSession(null)`, `setRoles([])`, `setDisplayName(null)`) BEFORE awaiting Supabase, so UI flips immediately;
  - call `await supabase.auth.signOut({ scope: "local" })` and surface errors via thrown exception so callers can toast;
  - return after a hard `window.location.assign("/auth")` fallback if the SPA navigation didn't fire within 300 ms (belt-and-suspenders for stuck sessions).

### 2. RoleContext: do NOT default to worker while loading

`src/contexts/RoleContext.tsx`
- Pull `rolesLoading` from `useAuth()`.
- Add `rolesLoading` to `RoleContextValue`.
- When `rolesLoading` is true OR `authRoles` is empty AND user exists, expose `role` as a special `"unknown"` sentinel (we'll add it to the `UserRoleType` union as a non-routable internal value) and `rolesLoading: true`.
- Components that need to render based on role (Sidebar, BottomNav, route guard) will skip work while `rolesLoading`.
- Only when roles really resolve to `[]` after the query finishes do we fall back — and we fall back to `"customer"` (least-privileged real role) instead of `"worker"`, since `worker` has stock-movement write permissions and silently granting those is unsafe. Surface a toast: "No role assigned, contact admin."

### 3. App layout: gate guards on rolesLoading and stop racing logout

`src/routes/app.tsx`
- Read `rolesLoading` from auth.
- The role-guard `useEffect` must early-return when `rolesLoading || !user`.
- The auth-guard runs first; once `!user`, immediately `navigate({ to: "/auth", replace: true })` and `return` — do not run any other effects on this render.
- Remove the `hasResolvedOnceRef` shortcut for the **logged-out** case: when `user` becomes null after having been logged in, we need to actually show the spinner briefly while we navigate, not keep showing the stale app behind it. Keep the ref only for the initial-mount flash prevention.
- Wrap the layout in a small `if (!user) return <RedirectingSpinner />;` once auth has resolved at least once and user is null. This guarantees no stale page renders during logout.

### 4. Sidebar + BottomNav: visible logout, single source of truth

`src/components/layout/Sidebar.tsx`
- `handleSignOut` already navigates to `/auth`, but wrap in try/catch and toast errors; also `await navigate({ to: "/auth", replace: true })` (replace, so back button doesn't re-enter).
- Show the sign-out button always, including for `customer` role.

`src/components/layout/BottomNav.tsx`
- The "Menu" slot opens the Sidebar in a Sheet — already wired. Verify the sign-out button inside the sheet works. No extra slot needed (5 is already maxed).

`src/components/layout/Header.tsx` (verify)
- If there's a profile/avatar dropdown, ensure it has a "Sign out" item that calls the same hook; if it doesn't have one yet, add it.

### 5. Defensive: clear React Query cache on sign-out

In `signOut()`, also call `queryClient.clear()` (import the singleton) so cached master data and per-user data from the previous user is wiped before the next login. Otherwise the next user briefly sees the previous user's products/customers cached for 5 min.

## Files

Edited:
- `src/contexts/AuthContext.tsx` — add `rolesLoading`, robust `signOut`, query cache clear.
- `src/contexts/RoleContext.tsx` — expose `rolesLoading`, never silently fall back to `worker`.
- `src/routes/app.tsx` — gate guards, real redirect spinner on logout.
- `src/components/layout/Sidebar.tsx` — error-handled `signOut`, replace-history navigate.
- `src/components/layout/Header.tsx` — confirm/add sign-out menu item.
- `src/lib/roles.ts` (only if needed) — optional: extend type for the loading sentinel; otherwise handle via the new `rolesLoading` flag without touching the union.

No DB changes. No new packages.

## Expected result

- On every login/refresh: while roles load, the layout shows a brief skeleton instead of flipping to "worker" view. Admin stays admin, customer stays customer.
- Clicking "Sign out" (desktop sidebar OR mobile menu sheet): app immediately shows the auth screen, no toast about permissions, no role-guard race, no being stuck inside `/app`.
- If `signOut` fails (offline), a toast tells the user instead of silently doing nothing.
- Cache from the previous user is cleared, preventing data leakage across accounts.
