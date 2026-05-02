import yoyoLogo from "@/assets/yoyo-logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  variant?: "dark" | "light";
  showWordmark?: boolean;
  className?: string;
}

/**
 * Yoyo brand mark.
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
        className="flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
      >
        <img
          src={yoyoLogo}
          alt="Yoyo"
          width={size}
          height={size}
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
          Yoyo
        </span>
      )}
    </div>
  );
}