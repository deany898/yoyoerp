import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "live" | "syncing" | "offline";

const COLORS: Record<Status, string> = {
  live: "#22C55E",
  syncing: "#F59E0B",
  offline: "#EF4444",
};

const LABELS: Record<Status, string> = {
  live: "Live",
  syncing: "Syncing…",
  offline: "Offline",
};

export function LiveIndicator() {
  const [status, setStatus] = useState<Status>("syncing");

  useEffect(() => {
    const channel = supabase.channel("connection-check");
    channel.subscribe((s) => {
      if (s === "SUBSCRIBED") setStatus("live");
      else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("offline");
      else setStatus("syncing");
    });
    const onOnline = () => setStatus("live");
    const onOffline = () => setStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      supabase.removeChannel(channel);
    };
  }, []);

  const color = COLORS[status];

  return (
    <span
      className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:inline-flex"
      title={LABELS[status]}
      aria-label={LABELS[status]}
    >
      <span className="relative flex h-2 w-2">
        {status === "live" && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: color }}
          />
        )}
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      </span>
      <span style={{ color }}>{LABELS[status]}</span>
    </span>
  );
}