import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Plus, Pencil, Trash2, X, Check, GripVertical, ChevronRight, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";

interface Cat {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function CategoryManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,parent_id,sort_order")
      .order("parent_id", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) toast.error("Failed to load categories", { description: error.message });
    setCats((data ?? []) as Cat[]);
    setLoading(false);
  };
  useEffect(() => { void refresh(); }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const { error } = await supabase.from("categories").insert({
      name, slug: slugify(name), parent_id: null, sort_order: cats.filter((c) => !c.parent_id).length,
    });
    if (error) { toast.error("Could not create", { description: error.message }); return; }
    toast.success("Category created");
    setNewName(""); setAdding(false);
    await refresh();
  };

  const handleRename = async () => {
    if (!editingId) return;
    const name = editName.trim(); if (!name) return;
    const { error } = await supabase.from("categories").update({ name, slug: slugify(name) }).eq("id", editingId);
    if (error) { toast.error("Rename failed"); return; }
    toast.success("Renamed");
    setEditingId(null);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? Subcategories will be moved to root.")) return;
    await supabase.from("categories").update({ parent_id: null }).eq("parent_id", id);
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    toast.success("Deleted");
    await refresh();
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const draggedId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || draggedId === overId) return;

    let newParentId: string | null = null;
    if (overId.startsWith("nest-")) {
      newParentId = overId.slice(5);
      if (newParentId === draggedId) return;
      // prevent nesting under own descendant
      const isDescendant = (childId: string, ancestorId: string): boolean => {
        const c = cats.find((x) => x.id === childId);
        if (!c?.parent_id) return false;
        if (c.parent_id === ancestorId) return true;
        return isDescendant(c.parent_id, ancestorId);
      };
      if (isDescendant(newParentId, draggedId)) {
        toast.error("Cannot nest a category under its own descendant");
        return;
      }
    } else if (overId === "root-zone") {
      newParentId = null;
    } else {
      return;
    }

    const cur = cats.find((c) => c.id === draggedId);
    if (!cur || cur.parent_id === newParentId) return;
    const { error } = await supabase.from("categories").update({ parent_id: newParentId }).eq("id", draggedId);
    if (error) { toast.error("Move failed", { description: error.message }); return; }
    toast.success(newParentId ? "Nested as subcategory" : "Moved to root");
    await refresh();
  };

  const roots = cats.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => cats.filter((c) => c.parent_id === id);

  if (!loading && cats.length === 0 && !adding) {
    return <EmptyState icon={FolderTree} title="No categories yet" description="Add a category, then drag one onto another to nest it." actionLabel="Add category" onAction={() => setAdding(true)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {cats.length} categories · drag to nest under another · drop on the root strip to un-nest
        </p>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add category
        </Button>
      </div>

      {adding && (
        <div className="flex items-center gap-2 rounded-lg border border-border p-2">
          <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Category name…" className="h-8 text-sm" />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAdd}><Check className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setAdding(false)}><X className="h-4 w-4" /></Button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <RootDropZone />
        <div className="rounded-lg border border-border divide-y divide-border">
          {roots.map((c) => (
            <CategoryNode
              key={c.id}
              cat={c}
              depth={0}
              childrenOf={childrenOf}
              editingId={editingId}
              editName={editName}
              onStartEdit={(c) => { setEditingId(c.id); setEditName(c.name); }}
              onChangeEdit={setEditName}
              onCommitEdit={handleRename}
              onCancelEdit={() => setEditingId(null)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function RootDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "root-zone" });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border-2 border-dashed px-3 py-2 text-center text-[11px] uppercase tracking-wide transition-colors ${
        isOver ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
      }`}
    >
      drop here to move to root
    </div>
  );
}

interface NodeProps {
  cat: Cat;
  depth: number;
  childrenOf: (id: string) => Cat[];
  editingId: string | null;
  editName: string;
  onStartEdit: (c: Cat) => void;
  onChangeEdit: (s: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

function CategoryNode(p: NodeProps) {
  const { cat, depth, childrenOf } = p;
  const kids = childrenOf(cat.id);
  const { setNodeRef: dragRef, listeners, attributes, isDragging } = useDraggable({ id: cat.id });
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: `nest-${cat.id}` });
  const isEditing = p.editingId === cat.id;

  return (
    <div>
      <div
        ref={dropRef}
        className={`flex items-center gap-2 px-3 py-2 transition-colors ${
          isOver ? "bg-primary/10 ring-1 ring-inset ring-primary" : "hover:bg-muted/30"
        } ${isDragging ? "opacity-40" : ""}`}
        style={{ paddingLeft: 12 + depth * 20 }}
      >
        <button
          ref={dragRef}
          {...listeners}
          {...attributes}
          className="cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="Drag"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {kids.length > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground rotate-90" />}
        {isEditing ? (
          <div className="flex flex-1 items-center gap-1">
            <Input autoFocus value={p.editName} onChange={(e) => p.onChangeEdit(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") p.onCommitEdit(); if (e.key === "Escape") p.onCancelEdit(); }}
              className="h-7 text-sm" />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={p.onCommitEdit}><Check className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={p.onCancelEdit}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <>
            <span className="flex-1 truncate text-sm font-medium">{cat.name}</span>
            {kids.length > 0 && <Badge variant="secondary" className="text-[10px]">{kids.length} sub</Badge>}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => p.onStartEdit(cat)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => p.onDelete(cat.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
      {kids.map((k) => (
        <CategoryNode key={k.id} {...p} cat={k} depth={depth + 1} />
      ))}
    </div>
  );
}
