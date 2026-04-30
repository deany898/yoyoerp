## Quick Order · high-speed wholesale rebuild

Replace the current bulky `/app/quick-order` form with a compact, spreadsheet-grade order pad. Same data flow (writes to `dispatch_orders` + `dispatch_order_lines`), brand-new UX optimised for B2B speed.

### What changes for the user

**Desktop / tablet**
- One slim header strip · customer · tier badge · warehouse · payment terms · address (popover) · DO number. No giant blue card.
- Spreadsheet-style product grid · `# · Product · Qty · UOM · Price · Disc · Tax · Total · ⋮`. SKU column removed (shown inline under product name).
- Each row uses an inline product picker that shows image, variant, tier price, available stock, pack options · selecting auto-fills price (from customer tier), UOM, units-per-pack.
- Keyboard-first · Enter adds a new row · Tab moves across cells · `Cmd/Ctrl+D` duplicates the current row · `Cmd/Ctrl+S` saves draft · `Cmd/Ctrl+Enter` submits.
- Sticky bottom totals bar always visible · subtotal · discount · tax · total · Save / Submit.
- Margin pill on each row (admin / manager only) · turns amber when margin < 8% · red when negative.
- Quick chips · "Recent products", "Frequent for this customer", "Repeat last order".

**Mobile**
- Compact dense cards (one row per product · tap to expand price / disc / tax).
- Floating "Add product" FAB opens a fullscreen bottom-sheet product picker with search, recent, frequent.
- Sticky footer summary · total + Submit.
- Swipe-left a card to delete.

### Role logic

| Role | Sees | Can edit |
|---|---|---|
| admin / manager | tier price, cost, margin pill | everything |
| sales / supervisor | tier price | qty, disc within rules, price within rules |
| dispatch | assigned orders only (no quick order entry) |

### Performance

- Product list cached once per session via `useProducts`; in-row picker filters in-memory with a debounced search (no per-keystroke network hit).
- Customer list lazy-loaded once.
- Recent / frequent products stored in `localStorage` per user (last 20 picks, top 10 by frequency).
- Auto-save draft to `localStorage` every 5 s; restored on next visit.

### Technical layout

```text
src/routes/app.quick-order.tsx                 — orchestrator only (~200 lines)
src/components/quick-order/QuickOrderHeader.tsx        — compact customer / wh / address strip
src/components/quick-order/CustomerAddressPopover.tsx  — billing + shipping editor
src/components/quick-order/ProductGrid.tsx             — desktop spreadsheet table
src/components/quick-order/ProductGridRow.tsx          — single row (qty stepper, inline price, margin pill)
src/components/quick-order/ProductPickerSheet.tsx      — mobile fullscreen bottom-sheet picker
src/components/quick-order/ProductInlinePicker.tsx     — desktop popover picker (image, tier price, stock)
src/components/quick-order/QuickActionsBar.tsx         — Recent / Frequent / Repeat-last chips
src/components/quick-order/StickyTotals.tsx            — sticky bottom totals + actions
src/lib/quick-order-store.ts                           — localStorage draft + recent / frequent helpers
src/lib/pricing.ts                                     — tier-price resolver (uses product_pricing_tiers)
```

### Data sources used

- `customers` · code, name, pricing_tier, billing_address, delivery_address, payment_terms, transporter (already loaded).
- `products` + `product_variants` · effective_cost, units_per_pack, sku, image (existing hook).
- `product_pricing_tiers` · resolves wholesale price by `tier_name` for the picked customer; falls back to `effective_cost × 1.25`.
- `inventory_stock` · sum of `available` across zones in the chosen warehouse → "In stock" badge.
- `product_images` · primary image for picker thumbnails.
- Writes unchanged · `dispatch_orders` header + `dispatch_order_lines` (already supports `discount_value`, `tax_rate`, `wholesale_price`, `unit_price`).

### Keyboard map

| Key | Action |
|---|---|
| Enter (in last cell) | Add new blank row |
| Tab / Shift+Tab | Move across cells |
| Cmd/Ctrl + D | Duplicate current row |
| Cmd/Ctrl + Backspace | Delete current row |
| Cmd/Ctrl + S | Save draft |
| Cmd/Ctrl + Enter | Submit order |
| / (slash) | Focus product search of current row |

### Accessibility / responsive rules

- Grid collapses to dense cards below `md`.
- Every row has a visible delete + duplicate action on hover (desktop) and a 3-dot menu on touch.
- Focus ring preserved on all inputs · numeric inputs use `inputMode="decimal"`.

### Out of scope (kept for later)

- Barcode scanner integration (interface left ready · `/` shortcut, structured for input intercept).
- Server-side draft persistence (only `localStorage` for now).
- Customer create flow (kept inline-create stub via existing `SmartSelect.onCreate`).

After approval I will implement the components above, replace `app.quick-order.tsx` with the new orchestrator, and verify both desktop grid and mobile bottom-sheet flows.