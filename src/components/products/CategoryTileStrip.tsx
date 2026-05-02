import { Layers, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryRow } from "@/hooks/useErpData";

interface Props {
  categories: CategoryRow[];
  active: string; // category id or "all"
  onChange: (next: string) => void;
}

/**
 * Horizontally swipeable category strip with 1:1 image tiles + name underneath.
 * Visible tile count: 4 on mobile, 6 on tablet, 8 on desktop.
 */
export function CategoryTileStrip({ categories, active, onChange }: Props) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex snap-x snap-mandatory gap-3">
        <Tile
          label="All"
          active={active === "all"}
          onClick={() => onChange("all")}
          icon={<Layers className="h-7 w-7 text-muted-foreground" />}
        />
        {categories.map((c) => (
          <Tile
            key={c.id}
            label={c.name}
            active={active === c.id}
            imageUrl={c.cover_image_url ?? undefined}
            onClick={() => onChange(c.id)}
            icon={<Package className="h-7 w-7 text-muted-foreground" />}
          />
        ))}
      </div>
    </div>
  );
}

function Tile({
  label,
  active,
  imageUrl,
  icon,
  onClick,
}: {
  label: string;
  active: boolean;
  imageUrl?: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Tile widths: ~4 visible on mobile, 6 on tablet, 8 on desktop
        "group flex shrink-0 snap-start basis-[22%] flex-col items-center gap-1.5 sm:basis-[15%] lg:basis-[11.5%]",
        "focus:outline-none",
      )}
    >
      <div
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-xl border bg-muted/40 transition",
          active
            ? "border-primary ring-2 ring-primary/30 shadow-sm"
            : "border-border group-hover:border-primary/50",
        )}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">{icon}</div>
        )}
      </div>
      <span
        className={cn(
          "line-clamp-2 w-full text-center text-[11px] leading-tight",
          active ? "font-semibold text-primary" : "text-foreground/80",
        )}
      >
        {label}
      </span>
    </button>
  );
}