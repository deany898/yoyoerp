import type { Database } from "@/integrations/supabase/types";

export type VendorCategory = Database["public"]["Enums"]["vendor_category"];
export type VendorPaymentMode = Database["public"]["Enums"]["vendor_payment_mode"];

export const VENDOR_CATEGORIES: { value: VendorCategory; label: string }[] = [
  { value: "raw_material", label: "Raw material" },
  { value: "plastic_granule", label: "Plastic granule" },
  { value: "electronic_component", label: "Electronic component" },
  { value: "packaging", label: "Packaging" },
  { value: "carton", label: "Carton" },
  { value: "poly", label: "Poly" },
  { value: "label", label: "Label" },
  { value: "machine_part", label: "Machine part" },
  { value: "mould_repair", label: "Mould repair" },
  { value: "consumable", label: "Consumable" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

export const VENDOR_PAYMENT_MODES: { value: VendorPaymentMode; label: string }[] = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "rtgs", label: "RTGS" },
  { value: "neft", label: "NEFT" },
  { value: "adjustment", label: "Adjustment" },
  { value: "other", label: "Other" },
];

export function categoryLabel(c: VendorCategory): string {
  return VENDOR_CATEGORIES.find((x) => x.value === c)?.label ?? c;
}

export function formatINR(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(v);
}