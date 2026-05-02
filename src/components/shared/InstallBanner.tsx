import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("install_dismissed")) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: 12,
        right: 12,
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background: "#0F172A",
        color: "#fff",
        border: "1px solid #1E293B",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,.35)",
      }}
      className="md:hidden"
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "#1E293B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Download size={18} color="#38BDF8" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Install Yoyo</div>
        <div style={{ fontSize: 11, color: "#94A3B8" }}>
          होमस्क्रीन पर add करें · Faster access
        </div>
      </div>
      <button
        type="button"
        onClick={async () => {
          if (prompt) {
            await prompt.prompt();
          }
          setShow(false);
        }}
        style={{
          padding: "8px 14px",
          background: "#2454A4",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Install
      </button>
      <button
        type="button"
        onClick={() => {
          setShow(false);
          localStorage.setItem("install_dismissed", "1");
        }}
        style={{
          padding: "8px 10px",
          background: "transparent",
          color: "#94A3B8",
          border: "none",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Later
      </button>
    </div>
  );
}