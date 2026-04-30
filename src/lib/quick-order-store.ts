const DRAFT_KEY = "yoyo:quick-order:draft";
const RECENT_KEY = "yoyo:quick-order:recent";
const FREQ_KEY = "yoyo:quick-order:frequency";

export interface DraftLine {
  uid: string;
  variant_id: string;
  qty: number;
  uom: string;
  unit_price: number;
  units_per_pack: number;
  discount_pct: number;
  tax_rate: number;
}

export interface OrderDraft {
  customer_id: string;
  warehouse_id: string;
  shipping_address: string;
  payment_terms: string;
  lines: DraftLine[];
  saved_at: number;
}

export function saveDraft(d: OrderDraft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {}
}
export function loadDraft(): OrderDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrderDraft;
  } catch { return null; }
}
export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

export function trackPick(variantId: string) {
  if (!variantId) return;
  try {
    const recent = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
    const next = [variantId, ...recent.filter((v) => v !== variantId)].slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));

    const freq = JSON.parse(localStorage.getItem(FREQ_KEY) ?? "{}") as Record<string, number>;
    freq[variantId] = (freq[variantId] ?? 0) + 1;
    localStorage.setItem(FREQ_KEY, JSON.stringify(freq));
  } catch {}
}
export function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]; } catch { return []; }
}
export function getFrequent(): string[] {
  try {
    const freq = JSON.parse(localStorage.getItem(FREQ_KEY) ?? "{}") as Record<string, number>;
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);
  } catch { return []; }
}