import { useEffect, useState } from "react";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

interface Props {
  categoryId: string;
  categoryName: string;
}

/**
 * Inline button on each category row · opens a small dialog to upload / replace
 * a single cover image stored on `categories.cover_image_url`.
 */
export function CategoryCoverButton({ categoryId, categoryName }: Props) {
  const [open, setOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void supabase
      .from("categories")
      .select("cover_image_url")
      .eq("id", categoryId)
      .single()
      .then(({ data }) => setCoverUrl((data as { cover_image_url: string | null } | null)?.cover_image_url ?? null));
  }, [open, categoryId]);

  const handleUploaded = async (url: string) => {
    const { error } = await supabase
      .from("categories")
      .update({ cover_image_url: url })
      .eq("id", categoryId);
    if (error) {
      notify.error("Could not save cover", { description: error.message });
      return;
    }
    setCoverUrl(url);
    notify.success("Cover updated");
  };

  const clear = async () => {
    const { error } = await supabase
      .from("categories")
      .update({ cover_image_url: null })
      .eq("id", categoryId);
    if (error) {
      notify.error("Could not clear cover", { description: error.message });
      return;
    }
    setCoverUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Cover image">
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cover image · {categoryName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="aspect-video overflow-hidden rounded-lg border border-border bg-muted">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No cover yet
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ImageUploader
              folder={`categories/${categoryId}`}
              onUploaded={handleUploaded}
              label={coverUrl ? "Replace" : "Upload cover"}
            />
            {coverUrl && (
              <Button size="sm" variant="ghost" onClick={clear} className="gap-1.5 text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}