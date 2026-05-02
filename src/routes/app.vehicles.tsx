import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Truck } from "lucide-react";
import { useVehicles } from "@/hooks/useStaffing";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/app/vehicles")({
  component: VehiclesPage,
  head: () => ({ meta: [{ title: "Vehicles · Yoyo" }, { name: "robots", content: "noindex" }] }),
});

function VehiclesPage() {
  const { t } = useLanguage();
  const { vehicles, loading } = useVehicles();
  const [workers, setWorkers] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("workers").select("id,name");
      const map: Record<string, string> = {};
      for (const w of (data ?? []) as Array<{ id: string; name: string }>) map[w.id] = w.name;
      setWorkers(map);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <Truck className="h-5 w-5 text-primary" />
        <h1 className="text-[22px] font-semibold tracking-tight">{t("nav_vehicles")}</h1>
      </header>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vehicles registered yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Registration</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Driver</th>
                <th className="px-4 py-2 text-left">Helper</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="px-4 py-2 font-mono">{v.registration}</td>
                  <td className="px-4 py-2">{v.vehicle_type ?? "—"}</td>
                  <td className="px-4 py-2">{v.driver_id ? workers[v.driver_id] ?? "—" : <span className="text-destructive">{t("staff_no_driver")}</span>}</td>
                  <td className="px-4 py-2">{v.delivery_helper_id ? workers[v.delivery_helper_id] ?? "—" : <span className="text-destructive">{t("staff_no_helper")}</span>}</td>
                  <td className="px-4 py-2">{v.is_active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}