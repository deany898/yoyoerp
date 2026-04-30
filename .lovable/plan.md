
# YOYO ERP rebrand · Phase 1.5

Apply YOYO branding across the app surface (logo, colors, names, manifest, PWA icons, marketing page) before resuming the data-migration phases. After this lands, Phase 2 (Catalog foundation) continues on the new visual identity.

## 1 · Brand assets

- Save the uploaded logo to the project at three resolutions:
  - `src/assets/yoyo-logo.png` — the source mark (full color on white) for in-app use
  - `public/icons/icon-192.png`, `icon-384.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` — regenerate from the logo on a **white tile** with safe padding so the mark reads on iOS/Android home screens
  - `public/favicon.ico` / `public/icons/favicon-32.png` — small favicon
- Add a tiny `<Logo />` component (`src/components/brand/Logo.tsx`) that renders the mark + "YOYO ERP" wordmark, with `size` and `variant="dark" | "light"` props. Used everywhere the brand appears.

## 2 · Color system (deep industrial blue)

Rewrite the design tokens in `src/styles.css`. New palette derived from the logo:

```text
Primary       deep industrial blue   #1E3A8A   (logo "Y")
Primary 600   richer blue for hover  #1E40AF
Accent warm   industrial orange      #F97316   (logo arc)
Accent cool   sky cyan               #38BDF8   (logo arc)
Background    ERP neutral off-white  #F7F8FA
Surface       pure white tile        #FFFFFF
Border        cool neutral           #E2E8F0
Foreground    near-black slate       #0F172A
Muted text    slate-500              #64748B
Sidebar bg    deep navy              #0B1733
Success       emerald 600            #059669
Warning       amber 500              #F59E0B
Danger        red 600                #DC2626
```

- Convert all values to oklch (matching the existing token format) and update both `:root` and `.dark` blocks.
- Remap chart colors to a blue-led ramp with orange + cyan as secondary accents.
- Update sidebar tokens to deep navy `#0B1733` (currently dark teal) so the dark left rail reads as ERP, not consumer SaaS.
- Update the `<meta name="theme-color">` and `manifest.webmanifest` `theme_color` to `#1E3A8A`, `background_color` to `#FFFFFF` (white tile).
- Update the comment block header in `styles.css` from "Stackwise Design System" to "YOYO ERP Design System".

## 3 · Name + copy swap

Replace every user-visible "Stackwise" with "YOYO ERP" (or "YOYO" alone where space is tight). Files to update:

- `public/manifest.webmanifest` — `name`, `short_name`, `description`
- `src/routes/__root.tsx` — `<title>`, `apple-mobile-web-app-title`, all OG/twitter tags, description
- `src/routes/index.tsx` — landing page hero, nav brand, meta, footer
- `src/routes/auth.tsx` — page title, description, header wordmark
- `src/components/layout/Sidebar.tsx` — sidebar wordmark (use `<Logo variant="light" />`)
- `src/components/layout/Header.tsx` — no copy change, but ensure mobile sheet shows the new logo
- `src/components/onboarding/OnboardingTour.tsx`, `src/hooks/useOnboarding.ts`, `src/lib/faq-data.ts`, `src/components/settings/SystemSettings.tsx`, `src/components/purchase-orders/POPrintView.tsx`, `src/lib/demo/seed-notifications.ts`, `src/lib/demo-store.ts` — copy + tour text + PO header
- All `src/routes/app.*.tsx` page heads (titles like "Catalog · Stackwise" → "Catalog · YOYO ERP")

Docs in `docs/PRD-*.json` and `docs/prd-inventory.json` are reference material — leave them unless you also want them rebranded (call it out and skip by default).

## 4 · Landing page (public surface)

The landing page is the future "public + ERP consistency" anchor. Rework it lightly so it reads as enterprise ERP, not consumer inventory app:

- Replace hero badge "Inventory Command Center" → "Industrial ERP Platform"
- Hero headline stays product-focused but uses the new deep-blue gradient + orange CTA
- Nav: render `<Logo variant="dark" />` left, "Sign in" + primary "Open ERP" right
- Trust strip under hero: ERP-style ("Built for operations · Role-based · Audit-ready · Mobile-first")
- Footer: "© YOYO ERP" with same logo, no Lovable mention
- Keep the existing feature tabs and 3D visuals; only swap colors and copy

## 5 · App chrome polish (mobile-first ERP)

- Sidebar: deep navy `#0B1733` background, white logo tile at the top (logo on white rounded square, 40px), section labels in slate-400 uppercase, active item with orange left-bar accent.
- Header: white surface, 1px slate border, primary buttons in deep blue, secondary in white-with-border. Quick actions (scan, +) keep icon-only on mobile.
- Bottom nav (mobile): white with deep-blue active icon and a thin orange underline on the active tab.
- Buttons: primary = deep blue, "CTA / warning" = orange, destructive = red. Update the variant defaults in `src/components/ui/button.tsx` only if needed (most should pick up the new `--primary` token automatically).
- Cards: white surface, slate-200 border, 8px radius (slightly softer than the matte ceramic 4-6px) for a calmer ERP feel.

## 6 · Memory + design guidelines update

- Rewrite `mem://style/aesthetic` with the new palette + "Premium industrial SaaS · ERP-grade".
- Update `mem://index.md` Core lines: brand → "YOYO ERP", colors → "Deep industrial blue + orange/cyan accents".
- Update `docs/design-guidelines.md` so the next iteration uses the new tokens as the source of truth.

## 7 · Verification

After implementing, screenshot:
1. Landing page (desktop + 390px mobile)
2. `/auth` page
3. `/app/dashboard` (signed-in, with sidebar)
4. Mobile bottom nav
5. PWA manifest preview (DevTools → Application)

Confirm: no remaining "Stackwise" text in user-visible UI, theme-color matches the new blue, the white logo tile renders as the PWA icon.

## 8 · Then resume Phase 2

Once the rebrand is approved and merged, immediately continue with **Phase 2 — Catalog foundation** as defined in `.lovable/plan.md` (categories, suppliers, locations, items, custom fields with RLS + the data-source abstraction). No scope change — just a different paint job underneath.

---

### Technical notes

- The uploaded logo will be copied via `code--copy user-uploads://LOGO.png src/assets/yoyo-logo.png` and PWA icons regenerated from it onto a white background using `nix run nixpkgs#imagemagick`.
- All color changes flow through CSS variables in `src/styles.css`; component code does not need per-element edits because Tailwind tokens (`bg-primary`, `text-primary`, etc.) read those variables.
- No database changes in this step. No new dependencies.
