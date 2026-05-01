import { useEffect, useState } from "react";
import { Star, Trash2, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "./ImageUploader";

type Image = { id: string; url: string; sort_order: number; is_primary: boolean };

interface Props {
  productId: string | null;
  /** When false (no product yet), only shows hint to save first */
  canEdit?: boolean;
}

/**
 * Gallery for a product · multi-image upload, mark-as-primary, delete.
 * Falls back to a "save the product first" hint when productId is null.
 */
export function ProductImageGallery({ productId, canEdit = true }: Props) {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!productId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("product_images")
      .select("id, url, sort_order, is_primary")
      .eq("product_id", productId)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });
    if (error) notify.error("Could not load images", { description: error.message });
    setImages((data ?? []) as Image[]);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleUploaded = async (url: string) => {
    if (!productId) return;
    const isFirst = images.length === 0;
    const { error } = await supabase.from("product_images").insert({
      product_id: productId,
      url,
      sort_order: images.length,
      is_primary: isFirst,
    });
    if (error) return notify.error("Could not save image", { description: error.message });
    void refresh();
  };

  const setPrimary = async (id: string) => {
    if (!productId) return;
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
    const { error } = await supabase.from("product_images").update({ is_primary: true }).eq("id", id);
    if (error) return notify.error("Could not update", { description: error.message });
    void refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("product_images").delete().eq("id", id);
    if (error) return notify.error("Could not delete", { description: error.message });
    void refresh();
  };

  if (!productId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Save the product first · then upload images here.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gallery</p>
        {canEdit && (
          <ImageUploader
            folder={`products/${productId}`}
            multiple
            onUploaded={handleUploaded}
            label="Add images"
          />
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 py-10 text-sm text-muted-foreground">
          <ImagePlus className="h-6 w-6" />
          No images yet · upload to start the gallery.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded-lg border border-border bg-muted">
              <img src={img.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              {img.is_primary && (
                <div className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  <Star className="h-2.5 w-2.5" /> Primary
                </div>
              )}
              {canEdit && (
                <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1 opacity-0 transition group-hover:opacity-100">
                  {!img.is_primary && (
                    <Button size="sm" variant="secondary" className="h-6 px-2 text-[10px]" onClick={() => setPrimary(img.id)}>
                      <Star className="mr-1 h-3 w-3" /> Set
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" className="ml-auto h-6 px-2 text-[10px]" onClick={() => remove(img.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}