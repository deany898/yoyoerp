import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, FileText, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useInventoryRequests, useProducts, useWarehouses,
  type RequestWithLines, type RequestStatusEnum,
} from "@/hooks/useErpData";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { SmartSelect } from "@/components/forms/SmartSelect";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExportButton } from "@/components/shared/ExportButton";
import { AutoCodeField } from "@/components/shared/AutoCodeField";

export const Route = createFileRoute("/app/requests")({
  component: RequestsPage,
  head: () => ({ meta: [{ title: "Requests · Yoyo" }] }),
});

const STATUS_COLORS: Record<RequestStatusEnum, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-sky-500/10 text-sky-700",
  approved: "bg-blue-500/10 text-blue-700",
  rejected: "bg-destructive/10 text-destructive",
  fulfilled: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-slate-500/10 text-slate-700",
};

interface DraftLine { variant_id: string; qty_requested: number; }
interface DraftReq {
  id?: string;
  request_number: string;
  status: RequestStatusEnum;
  warehouse_id: string;
  reason: string;
  notes: string;
  lines: DraftLine[];
}

function emptyDraft(): DraftReq {
  const yymm = new Date().toISOString().slice(2, 7).replace("-", "");
  return {
    request_number: `REQ-${yymm}-${Math.floor(Math.random() * 9000 + 1000)}`,
    status: "draft", warehouse_id: "", reason: "", notes: "", lines: [],
  };
}

function RequestsPage() {
  const { requests, loading, refresh } = useInventoryRequests();
  const { products } = useProducts();
  const { warehouses } = useWarehouses();
  const { can } = usePermissions();
  const { user } = useAuth();
  const canApprove = can("approve_request");

  const variantOptions = useMemo(() =>
    products.flatMap((p) => p.variants.map((v) => ({
      id: v.id, label: `${p.name} · ${v.variant_name} (${v.sku})`,
    }))), [products]);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftReq | null>(null);
  const [deleting, setDeleting] = useState<RequestWithLines | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() { setDraft(emptyDraft()); setOpen(true); }
  function openEdit(r: RequestWithLines) {
    setDraft({
      id: r.id, request_number: r.request_number, status: r.status,
      warehouse_id: r.warehouse_id ?? "", reason: r.reason ?? "", notes: r.notes ?? "",
      lines: r.lines.map((l) => ({ variant_id: l.variant_id, qty_requested: Number(l.qty_requested) })),
    });
    setOpen(true);
  }

  function addLine() {
    if (!draft) return;
    setDraft({ ...draft, lines: [...draft.lines, { variant_id: "", qty_requested: 1 }] });
  }
  function updateLine(i: number, patch: Partial<DraftLine>) {
    if (!draft) return;
    const lines = [...draft.lines]; lines[i] = { ...lines[i], ...patch };
    setDraft({ ...draft, lines });
  }
  function removeLine(i: number) {
    if (!draft) return;
    setDraft({ ...draft, lines: draft.lines.filter((_, idx) => idx !== i) });
  }

  async function handleSave() {
    if (!draft) return;
    if (draft.lines.length === 0) { toast.error("Add at least one line"); return; }
    if (draft.lines.some((l) => !l.variant_id || l.qty_requested <= 0)) {
      toast.error("Each line needs a variant and qty > 0"); return;
    }
    setSaving(true);
    const headerPayload = {
      request_number: draft.request_number, status: draft.status,
      warehouse_id: draft.warehouse_id || null,
      reason: draft.reason || null, notes: draft.notes || null,
      requested_by: user?.id ?? null,
    };
    let reqId = draft.id;
    if (reqId) {
      const { error } = await supabase.from("inventory_requests").update(headerPayload).eq("id", reqId);
      if (error) { setSaving(false); toast.error("Save failed", { description: error.message }); return; }
      await supabase.from("inventory_request_lines").delete().eq("request_id", reqId);
    } else {
      const { data, error } = await supabase.from("inventory_requests").insert(headerPayload).select("id").single();
      if (error || !data) { setSaving(false); toast.error("Save failed", { description: error?.message }); return; }
      reqId = data.id;
    }
    const linesPayload = draft.lines.map((l) => ({
      request_id: reqId!, variant_id: l.variant_id, qty_requested: l.qty_requested,
    }));
    const { error: lErr } = await supabase.from("inventory_request_lines").insert(linesPayload);
    setSaving(false);
    if (lErr) { toast.error("Lines failed", { description: lErr.message }); return; }
    toast.success(draft.id ? "Request updated" : "Request created");
    setOpen(false); setDraft(null); await refresh();
  }

  async function quickStatus(r: RequestWithLines, status: RequestStatusEnum) {
    const patch: {
      status: RequestStatusEnum;
      approved_by?: string | null;
      approved_at?: string | null;
      fulfilled_at?: string | null;
    } = { status };
    if (status === "approved") { patch.approved_by = user?.id ?? null; patch.approved_at = new Date().toISOString(); }
    if (status === "fulfilled") { patch.fulfilled_at = new Date().toISOString(); }
    const { error } = await supabase.from("inventory_requests").update(patch).eq("id", r.id);
    if (error) { toast.error("Update failed", { description: error.message }); return; }
    toast.success(`Marked ${status}`);
    await refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("inventory_requests").delete().eq("id", deleting.id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    toast.success("Request deleted");
    setDeleting(null); await refresh();
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inventory requests</h1>
          <p className="text-sm text-muted-foreground">{requests.length} requests</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="inventory_requests"
            capability="movements.export"
            rows={requests as unknown as Record<string, unknown>[]}
            columns={[
              { key: "request_number", label: "Request #" },
              { key: "status", label: "Status" },
              { key: "lines", label: "Lines", format: (v) => Array.isArray(v) ? v.length : 0 },
              { key: "reason", label: "Reason" },
              { key: "created_at", label: "Created", format: (v) => v ? new Date(v as string).toISOString() : "" },
            ]}
          />
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> New request
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-white p-8 text-sm text-muted-foreground">Loading…</div>
      ) : requests.length === 0 ? (
        <EmptyState icon={FileText} title="No requests yet"
          description="Submit an internal stock request from production, dispatch, or any zone."
          actionLabel="New request" onAction={openCreate} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-56"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.request_number}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[r.status]} variant="outline">{r.status}</Badge></TableCell>
                  <TableCell className="font-mono">{r.lines.length}</TableCell>
                  <TableCell className="text-muted-foreground">{r.reason ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {canApprove && r.status === "submitted" && (
                        <>
                          <Button size="sm" variant="outline" className="h-8" onClick={() => quickStatus(r, "approved")}>Approve</Button>
                          <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => quickStatus(r, "rejected")}>Reject</Button>
                        </>
                      )}
                      {canApprove && r.status === "approved" && (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => quickStatus(r, "fulfilled")}>Fulfill</Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleting(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{draft?.id ? "Edit request" : "New request"}</SheetTitle>
            <SheetDescription>Internal stock request.</SheetDescription>
          </SheetHeader>
          {draft && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <AutoCodeField label="Request #" value={draft.id ? draft.request_number : ""} pendingCode={draft.id ? null : draft.request_number} />
                <div>
                  <Label>Status</Label>
                  <SmartSelect
                    options={(["draft","submitted","approved","rejected","fulfilled","cancelled"] as RequestStatusEnum[]).map((s) => ({ value: s, label: s }))}
                    value={draft.status}
                    onChange={(v) => v && setDraft({ ...draft, status: v as RequestStatusEnum })}
                    searchPlaceholder="Search status…"
                  />
                </div>
              </div>
              <div>
                <Label>Warehouse</Label>
                <SmartSelect
                  options={warehouses.map((w) => ({ value: w.id, label: w.name, hint: w.code }))}
                  value={draft.warehouse_id || null}
                  onChange={(v) => setDraft({ ...draft, warehouse_id: v ?? "" })}
                  placeholder="Choose warehouse"
                  searchPlaceholder="Search warehouse…"
                />
              </div>
              <div><Label>Reason</Label><Input value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="Production batch, dispatch, etc." /></div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-3.5 w-3.5" /> Add item</Button>
                </div>
                {draft.lines.length === 0 ? (
                  <p className="rounded border border-dashed border-border py-4 text-center text-xs text-muted-foreground">No items yet</p>
                ) : (
                  <div className="space-y-2">
                    {draft.lines.map((l, i) => (
                      <div key={i} className="grid grid-cols-[1fr_100px_36px] gap-2 items-center">
                        <SmartSelect
                          options={variantOptions.map((o) => ({ value: o.id, label: o.label }))}
                          value={l.variant_id || null}
                          onChange={(v) => updateLine(i, { variant_id: v ?? "" })}
                          placeholder="Pick variant"
                          searchPlaceholder="Search product or SKU…"
                        />
                        <Input type="number" min={0} step="0.01" value={l.qty_requested} onChange={(e) => updateLine(i, { qty_requested: Number(e.target.value) })} />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeLine(i)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div><Label>Notes</Label><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save request"}</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.request_number}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}