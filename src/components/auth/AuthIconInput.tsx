import { useState, type InputHTMLAttributes, type ComponentType } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  type?: "text" | "email" | "password" | "tel";
  /** Adds show/hide toggle. Forces type=password initially. */
  password?: boolean;
};

export function AuthIconInput({ id, label, icon: Icon, type = "text", password, className, ...rest }: Props) {
  const [show, setShow] = useState(false);
  const inputType = password ? (show ? "text" : "password") : type;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={inputType}
          className={cn("h-11 pl-9", password && "pr-10", className)}
          {...rest}
        />
        {password && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}