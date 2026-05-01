import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Loader2, Clock, ArrowRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGlobalSearch, useRecentSearches, ENTITY_LABEL, type SearchResult } from "@/hooks/useGlobalSearch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchPalette({ open, onOpenChange }: Props) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { results, loading } = useGlobalSearch(q);
  const { recents, refresh } = useRecentSearches(6);

  useEffect(() => {
    if (!open) setQ("");
    else refresh();
  }, [open, refresh]);

  // Group by entity
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.entity] ||= []).push(r);
    return acc;
  }, {});

  const go = (href: string) => {
    onOpenChange(false);
    // tiny defer so dialog unmount completes before nav
    setTimeout(() => navigate({ to: href }), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search across products, customers, orders, suppliers…"
            className="h-9 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline">esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {q.length < 2 && recents.length > 0 && (
            <div>
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent</div>
              {recents.map((r) => (
                <button
                  key={r}
                  onClick={() => setQ(r)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {r}
                </button>
              ))}
            </div>
          )}

          {q.length >= 2 && results.length === 0 && !loading && (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">No results · only entities you can access are searched</div>
          )}

          {Object.entries(grouped).map(([entity, rows]) => (
            <div key={entity} className="mb-2">
              <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{ENTITY_LABEL[entity as keyof typeof ENTITY_LABEL]}</span>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{rows.length}</Badge>
              </div>
              {rows.map((r) => (
                <button
                  key={`${r.entity}-${r.id}`}
                  onClick={() => go(r.href)}
                  className="group flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-accent"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{r.label}</div>
                    {r.sub && <div className="truncate text-xs text-muted-foreground">{r.sub}</div>}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                </button>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}