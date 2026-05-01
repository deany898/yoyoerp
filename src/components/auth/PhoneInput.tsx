import { Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTRY_CODES, findCountry } from "@/lib/country-codes";

interface Props {
  id: string;
  label?: string;
  countryIso: string;
  onCountryIsoChange: (iso: string) => void;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}

export function PhoneInput({
  id, label = "Mobile", countryIso, onCountryIsoChange,
  value, onChange, required, placeholder = "10-digit mobile",
}: Props) {
  const c = findCountry(countryIso);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2">
        <select
          aria-label="Country code"
          value={countryIso}
          onChange={(e) => onCountryIsoChange(e.target.value)}
          className="h-11 w-[110px] rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {COUNTRY_CODES.map((opt) => (
            <option key={`${opt.iso}-${opt.code}`} value={opt.iso}>
              {opt.flag} +{opt.code}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="h-11 pl-9"
            aria-describedby={`${id}-help`}
          />
        </div>
      </div>
      <p id={`${id}-help`} className="text-[11px] text-muted-foreground">
        Default {c.flag} {c.name} (+{c.code}). Change above for other countries.
      </p>
    </div>
  );
}
