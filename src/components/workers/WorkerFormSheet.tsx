import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import type { WorkerRow } from "@/hooks/useMfgData";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  worker: WorkerRow | null;
  showPayroll: boolean;
  onSaved: () => void;
}

function digitsOnly(s: string) {
  return (s ?? "").replace(/[^\d+]/g, "");
}

export function WorkerFormSheet({ open, onOpenChange, worker, showPayroll, onSaved }: Props) {
  const isEdit = !!worker?.id;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mobile, setMobile] = useState("");
  const [salary, setSalary] = useState<string>("");
  const [dutyHours, setDutyHours] = useState<string>("10");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(worker?.name ?? "");
    setCode(worker?.code ?? "");
    setMobile(worker?.phone ?? "");
    setIsActive(worker?.is_active ?? true);
    // Default duty hours to 10, salary blank · we'll fetch existing payroll config below
    setSalary("");
    setDutyHours("10");
    if (worker?.id && showPayroll) {
      void supabase
        .from("payroll_config")
        .select("monthly_salary,duty_hours,hourly_rate")
        .eq("worker_id", worker.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) {
            // derive salary from worker.hourly_rate * 10 as a fallback
            setSalary(worker.hourly_rate ? String(Number(worker.hourly_rate) * 10) : "");
            return;
          }
          setDutyHours(String(data.duty_hours ?? 10));
          setSalary(data.monthly_salary ? String(data.monthly_salary) : worker.hourly_rate ? String(Number(worker.hourly_rate) * Number(data.duty_hours ?? 10)) : "");
        });
    }
  }, [open, worker, showPayroll]);

  const hourlyRate = useMemo(() => {
    const s = Number(salary);
    const h = Number(dutyHours);
    if (!s || !h) return 0;
    return s / h;
  }, [salary, dutyHours]);

  async function save() {
    if (!name.trim()) { notify.warning("Name is required"); return; }
    const m = digitsOnly(mobile);
    if (!m || m.replace(/\D/g, "").length < 10) {
      notify.warning("Mobile number is required (10+ digits)");
      return;
    }
    setSaving(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      phone: m,
      is_active: isActive,
      job_role: "worker",
      hourly_rate: hourlyRate,
    };
    if (isEdit) payload.code = code || worker!.code;

    const res = isEdit
      ? await supabase.from("workers").update(payload).eq("id", worker!.id).select("id").maybeSingle()
      : await supabase.from("workers").insert(payload).select("id").maybeSingle();

    if (res.error || !res.data) {
      setSaving(false);
      notify.error(`Could not save worker`, { description: res.error?.message });
      return;
    }

    const workerId = res.data.id as string;

    if (showPayroll && Number(salary) > 0) {
      const { error: pErr } = await supabase
        .from("payroll_config")
        .upsert(
          {
            worker_id: workerId,
            pay_basis: "monthly_salary",
            monthly_salary: Number(salary),
            duty_hours: Number(dutyHours) || 10,
            hourly_rate: hourlyRate,
          },
          { onConflict: "worker_id" },
        );
      if (pErr) notify.warning("Worker saved, payroll details failed", { description: pErr.message });
    }

    setSaving(false);
    notify.success(`Worker ${isEdit ? "updated" : "created"}`);
    onSaved();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit worker" : "New worker"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update worker details." : "Add a new shop-floor worker · they're auto-assigned the worker role."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </Field>

          <Field label="Mobile number" required>
            <Input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 9876543210"
              inputMode="tel"
            />
          </Field>

          {showPayroll && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Salary (₹)">
                  <Input
                    type="number"
                    step="1"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="e.g. 400"
                  />
                </Field>
                <Field label="Duty hours">
                  <Input
                    type="number"
                    step="0.5"
                    value={dutyHours}
                    onChange={(e) => setDutyHours(e.target.value)}
                    placeholder="e.g. 10"
                  />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">
                Computed rate · <span className="font-mono">₹{hourlyRate.toFixed(2)}/hr</span>
                {" "}(salary ÷ duty hours)
              </p>
            </>
          )}

          <Field label="Active">
            <div className="flex items-center gap-3 pt-1">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-sm text-muted-foreground">{isActive ? "Active" : "Inactive"}</span>
            </div>
          </Field>

          {isEdit && (
            <Field label="Employee code">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Auto-generated" />
            </Field>
          )}
        </div>

        <SheetFooter className="mt-6 flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save changes" : "Create worker"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}