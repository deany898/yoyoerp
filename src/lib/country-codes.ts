export interface CountryCode {
  code: string;        // dial code without "+", e.g. "91"
  iso: string;         // ISO 3166-1 alpha-2
  name: string;
  flag: string;        // emoji
}

/** Curated list, India first (default). */
export const COUNTRY_CODES: CountryCode[] = [
  { code: "91",  iso: "IN", name: "India",          flag: "🇮🇳" },
  { code: "1",   iso: "US", name: "United States",  flag: "🇺🇸" },
  { code: "44",  iso: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "971", iso: "AE", name: "UAE",            flag: "🇦🇪" },
  { code: "65",  iso: "SG", name: "Singapore",      flag: "🇸🇬" },
  { code: "61",  iso: "AU", name: "Australia",      flag: "🇦🇺" },
  { code: "1",   iso: "CA", name: "Canada",         flag: "🇨🇦" },
  { code: "49",  iso: "DE", name: "Germany",        flag: "🇩🇪" },
  { code: "33",  iso: "FR", name: "France",         flag: "🇫🇷" },
  { code: "81",  iso: "JP", name: "Japan",          flag: "🇯🇵" },
];

export const DEFAULT_COUNTRY_ISO = "IN";

export function findCountry(iso: string): CountryCode {
  return COUNTRY_CODES.find((c) => c.iso === iso) ?? COUNTRY_CODES[0];
}

/** Strip non-digits from raw mobile input. */
export function digitsOnly(s: string): string {
  return s.replace(/\D+/g, "");
}

/** Format mobile as +<code><digits> for resolution / storage. */
export function toE164(countryIso: string, mobile: string): string {
  const c = findCountry(countryIso);
  const digits = digitsOnly(mobile);
  return `+${c.code}${digits}`;
}
