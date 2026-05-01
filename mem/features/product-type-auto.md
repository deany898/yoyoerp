---
name: Auto product type from BOM
description: products.product_type is system-derived from BOM topology · never user-edited
type: feature
---
`products.product_type` is set automatically by DB triggers (`trg_recalc_product_type_from_bom` on `bom_master` and `bom_lines`, calling `public.recalc_product_type(uuid)`):

- no active BOM produces the product → `raw_material` (Raw)
- produced by an active BOM AND any of its variants is consumed in another product's `bom_lines` → `wip` (Semi-finished)
- produced by an active BOM AND not consumed elsewhere → `finished_good`
- `packaging` is left untouched (managed via `product_packaging` / `variant_kind`)

Self-consumption is ignored. UI shows the type as a read-only badge (`ProductFormSheet`) labeled "Auto from BOM". Do not pass `product_type` in product insert/update payloads.
