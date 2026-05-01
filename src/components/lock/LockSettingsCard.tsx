import { useEffect, useState } from "react";
import { Fingerprint, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  setPin,
  hasPin,
  clearPin,
  hasBiometric,
  enrollBiometric,
  clearBiometric,
  isBiometricSupported,
} from "@/lib/lock-storage";
import { notify } from "@/lib/notify";

interface Props {
  userId: string;
  userName: string;
}

export function LockSettingsCard({ userId, userName }: Props) {
  const [pinSet, setPinSet] = useState(false);
  const [bioSet, setBioSet] = useState(false);
  const [pin, setPinInput] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPinSet(hasPin(userId));
    setBioSet(hasBiometric(userId));
  }, [userId]);

  async function savePin() {
    if (!/^\d{4}$/.test(pin)) return notify.warning("PIN must be 4 digits");
    if (pin !== pin2) return notify.warning("PINs do not match");
    setBusy(true);
    try {
      await setPin(userId, pin);
      setPinSet(true);
      setPinInput("");
      setPin2("");
      notify.success("PIN set. App will lock when reopened.");
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  function removePin() {
    clearPin(userId);
    setPinSet(false);
    notify.success("PIN removed");
  }

  async function enableBio() {
    setBusy(true);
    try {
      await enrollBiometric(userId, userName || userId);
      setBioSet(true);
      notify.success("Biometric unlock enabled");
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Could not enable biometric");
    } finally { setBusy(false); }
  }

  function disableBio() {
    clearBiometric(userId);
    setBioSet(false);
    notify.success("Biometric unlock disabled");
  }

  const bioSupported = isBiometricSupported();

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">App lock</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Locks this device when the app is reopened. Your sign-in stays active for 15 days of use.
      </p>
      <Separator className="my-4" />

      {/* PIN */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Lock className="h-4 w-4" /> 4-digit PIN
          {pinSet && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Active
            </span>
          )}
        </div>
        {pinSet ? (
          <Button variant="outline" size="sm" onClick={removePin} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Remove PIN
          </Button>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>New PIN</Label>
              <Input
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm PIN</Label>
              <Input
                inputMode="numeric"
                maxLength={4}
                value={pin2}
                onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button size="sm" onClick={savePin} disabled={busy}>Set PIN</Button>
            </div>
          </div>
        )}
      </div>

      <Separator className="my-5" />

      {/* Biometric */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Fingerprint className="h-4 w-4" /> Biometric unlock
          {bioSet && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Active
            </span>
          )}
        </div>
        {!bioSupported ? (
          <p className="text-xs text-muted-foreground">
            This device or browser doesn't support biometric authentication.
          </p>
        ) : bioSet ? (
          <Button variant="outline" size="sm" onClick={disableBio} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Disable biometric
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={enableBio} disabled={busy} className="gap-1.5">
            <Fingerprint className="h-4 w-4" /> Enable biometric
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground">
          Uses your phone's fingerprint or face unlock. The biometric data never leaves your device.
        </p>
      </div>
    </section>
  );
}