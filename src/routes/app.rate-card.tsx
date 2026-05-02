import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/app/rate-card")({
  component: RateCardPage,
  head: () => ({ meta: [{ title: "Rate card · Yoyo" }, { name: "robots", content: "noindex" }] }),
});

interface Row { id: string; name: string; department: string | null; sub_role: string | null; payment_type: string | null; hourly_rate: number | null; piece_rate: number | null }

function RateCardPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("workers")
        .select("id,name,department,sub_role,payment_type,hourly_rate,piece_rate")
        .eq("is_active", true)
        .order("name");
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="text-[22px] font-semibold tracking-tight">{t("nav_rate_card")}</h1>
      </header>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Department</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Pay type</th>
                <th className="px-4 py-2 text-right font-mono">₹/hr</th>
                <th className="px-4 py-2 text-right font-mono">₹/piece</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{w.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{w.department ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{w.sub_role ?? "—"}</td>
                  <td className="px-4 py-2">{w.payment_type ?? "hourly"}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{Number(w.hourly_rate ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{Number(w.piece_rate ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}