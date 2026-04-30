import yoyoLogo from "@/assets/yoyo-logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  variant?: "dark" | "light";
  showWordmark?: boolean;
  className?: string;
}

/**
 * YOYO ERP brand mark.
 * The logo always sits on a white tile so the multi-color mark stays legible
 * on dark navy sidebars and light surfaces alike.
 */
export function Logo({
  size = 32,
  variant = "dark",
  showWordmark = true,
  className,
}: LogoProps) {
  const wordmarkColor =
    variant === "light" ? "text-white" : "text-foreground";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="flex shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5"
        style={{ width: size, height: size }}
      >
        <img
          src={yoyoLogo}
          alt="YOYO ERP"
          width={Math.round(size * 0.78)}
          height={Math.round(size * 0.78)}
          className="object-contain"
        />
      </div>
      {showWordmark && (
        <span
          className={cn(
            "font-semibold tracking-tight leading-none",
            wordmarkColor,
          )}
          style={{ fontSize: Math.round(size * 0.5) }}
        >
          YOYO <span className="font-light opacity-80">ERP</span>
        </span>
      )}
    </div>
  );
}