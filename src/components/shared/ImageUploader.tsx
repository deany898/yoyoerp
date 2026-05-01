import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";

interface Props {
  /** Storage bucket · default: product-images */
  bucket?: string;
  /** Folder prefix inside the bucket · e.g. `products/<id>` */
  folder: string;
  /** Allow more than one upload at a time */
  multiple?: boolean;
  /** Called with the public URL of each uploaded file */
  onUploaded: (url: string, path: string) => void | Promise<void>;
  /** Optional small label text */
  label?: string;
}

/**
 * Lightweight uploader · pushes files to Supabase storage and returns public URLs.
 * Used by product gallery, category cover and any future image fields.
 */
export function ImageUploader({ bucket = "product-images", folder, multiple = false, onUploaded, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          notify.error("Only image files are allowed");
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          notify.error(`${file.name} is larger than 5 MB`);
          continue;
        }
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${folder.replace(/\/+$/g, "")}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: false,
          contentType: file.type,
          cacheControl: "3600",
        });
        if (error) {
          notify.error(`Upload failed · ${file.name}`, { description: error.message });
          continue;
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        await onUploaded(data.publicUrl, path);
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="gap-2"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {busy ? "Uploading…" : label ?? (multiple ? "Add images" : "Upload image")}
      </Button>
    </>
  );
}