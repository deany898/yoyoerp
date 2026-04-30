import { useEffect, useState, type ChangeEvent } from "react";
import { Paperclip, Upload, Trash2, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const KIND_LABELS: Record<string, string> = {
  lr: "LR / Lorry receipt",
  invoice: "Supplier invoice",
  eway_bill: "E-way bill",
  delivery_challan: "Delivery challan",
  qc: "QC document",
  packaging: "Packaging photo",
  shipment_proof: "Shipment proof",
  other: "Other",
};

interface DocRow {
  id: string; kind: string; storage_path: string;
  file_name: string; mime_type: string | null;
}

interface Props { poId: string | null; canManage: boolean; }

export function PODocumentsPanel({ poId, canManage }: Props) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [kind, setKind] = useState<string>("lr");
  const [uploading, setUploading] = useState(false);

  async function refresh() {
    if (!poId) { setDocs([]); return; }
    const { data, error } = await supabase
      .from("po_documents" as never).select("*").eq("po_id" as never, poId)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load documents", { description: error.message });
    setDocs((data ?? []) as DocRow[]);
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [poId]);

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !poId) return;
    setUploading(true);
    const path = `${poId}/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
    const up = await supabase.storage.from("po-documents").upload(path, file, { upsert: false });
    if (up.error) { setUploading(false); toast.error("Upload failed", { description: up.error.message }); return; }
    const { data: userRes } = await supabase.auth.getUser();
    const ins = await supabase.from("po_documents" as never).insert({
      po_id: poId, kind, storage_path: path,
      file_name: file.name, mime_type: file.type, size_bytes: file.size,
      uploaded_by: userRes.user?.id ?? null,
    } as never);
    setUploading(false);
    if (ins.error) { toast.error("Save failed", { description: ins.error.message }); return; }
    toast.success("Document uploaded");
    void refresh();
  }

  async function openDoc(d: DocRow) {
    const { data, error } = await supabase.storage.from("po-documents").createSignedUrl(d.storage_path, 60 * 5);
    if (error || !data) { toast.error("Cannot open file"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(d: DocRow) {
    if (!confirm(`Delete ${d.file_name}?`)) return;
    await supabase.storage.from("po-documents").remove([d.storage_path]);
    const { error } = await supabase.from("po_documents" as never).delete().eq("id" as never, d.id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    toast.success("Document deleted");
    void refresh();
  }

  if (!poId) {
    return (
      <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
        Save the PO before attaching documents.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div>
            <Label className="text-xs">Document type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button asChild disabled={uploading} variant="outline" size="sm" className="h-9 gap-1.5">
            <label className="cursor-pointer">
              <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload"}
              <input type="file" className="hidden" onChange={onUpload} accept="image/*,application/pdf" />
            </label>
          </Button>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          No documents attached.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d) => {
            const isImg = d.mime_type?.startsWith("image/");
            const Icon = isImg ? ImageIcon : FileText;
            return (
              <li key={d.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <button type="button" onClick={() => openDoc(d)} className="min-w-0 flex-1 text-left text-sm hover:underline">
                  <span className="truncate">{d.file_name}</span>
                </button>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">{KIND_LABELS[d.kind] ?? d.kind}</span>
                {canManage && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(d)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!canManage && docs.length > 0 && (
        <p className="text-[11px] text-muted-foreground"><Paperclip className="inline h-3 w-3 mr-1" /> View-only access.</p>
      )}
    </div>
  );
}