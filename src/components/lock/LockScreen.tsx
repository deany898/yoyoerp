import { useEffect, useState } from "react";
import { Fingerprint, Delete, ShieldCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import {
  hasPin,
  hasBiometric,
  verifyPin,
  verifyBiometric,
  isBiometricSupported,
} from "@/lib/lock-storage";
import { notify } from "@/lib/notify";

interface Props {
  userId: string;
  userLabel: string;
  onUnlock: () => void;
  onSignOut: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function LockScreen({ userId, userLabel, onUnlock, onSignOut }: Props) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  const pinEnabled = hasPin(userId);
  const bioEnabled = hasBiometric(userId) && isBiometricSupported();

  // Auto-prompt biometric on mount when available
  useEffect(() => {
    if (!bioEnabled) return;
    let cancelled = false;
    void (async () => {
      const ok = await verifyBiometric(userId);
      if (!cancelled && ok) onUnlock();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-submit when 4 digits typed
  useEffect(() => {
    if (pin.length !== 4 || busy) return;
    setBusy(true);
    void (async () => {
      const ok = await verifyPin(userId, pin);
      if (ok) {
        onUnlock();
      } else {
        setShake(true);
        setPin("");
        setTimeout(() => setShake(false), 400);
        notify.error("Wrong PIN");
      }
      setBusy(false);
    })();
  }, [pin, busy, userId, onUnlock]);

  function tap(k: string) {
    if (k === "del") return setPin((p) => p.slice(0, -1));
    if (!k) return;
    setPin((p) => (p.length >= 4 ? p : p + k));
  }

  async function tryBio() {
    const ok = await verifyBiometric(userId);
    if (ok) onUnlock();
    else notify.error("Biometric failed");
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-background px-6 py-10">
      <div className="flex w-full flex-col items-center gap-3 pt-6">
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-border">
          <Logo />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold">App locked</h1>
          <p className="mt-1 text-xs text-muted-foreground">{userLabel}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        {pinEnabled ? (
          <>
            <div className={`flex gap-3 ${shake ? "animate-pulse" : ""}`}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full border ${
                    pin.length > i ? "border-primary bg-primary" : "border-border bg-transparent"
                  }`}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {KEYS.map((k, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!k || busy}
                  onClick={() => tap(k)}
                  className={`h-16 w-16 rounded-full text-xl font-medium transition active:scale-95 ${
                    k
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border hover:bg-accent"
                      : "invisible"
                  }`}
                  aria-label={k === "del" ? "Delete" : k || "blank"}
                >
                  {k === "del" ? <Delete className="mx-auto h-5 w-5" /> : k}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Use biometric to unlock
          </div>
        )}

        {bioEnabled && (
          <Button variant="outline" size="lg" className="gap-2" onClick={tryBio}>
            <Fingerprint className="h-5 w-5" /> Use biometric
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out and use password
      </button>
    </div>
  );
}