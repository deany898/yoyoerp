import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface SmartSelectOption {
  value: string;
  label: string;
  /** Optional secondary text shown muted below the label. */
  hint?: string;
}

interface SmartSelectProps {
  /** All selectable options. Filtering is local — pass already-fetched data. */
  options: SmartSelectOption[];
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** Search box placeholder. */
  searchPlaceholder?: string;
  /** Empty state copy when no options match the query. */
  emptyText?: string;
  /** Called when the user clicks "Create new …". Receives the typed query. */
  onCreate?: (query: string) => void;
  /** Custom label for the create row. Defaults to "Create new". */
  createLabel?: string;
  /** Disable the input. */
  disabled?: boolean;
  /** Render trigger inline (no border). */
  inline?: boolean;
  /** Custom render for the selected value pill. */
  renderValue?: (opt: SmartSelectOption) => ReactNode;
  className?: string;
}

/**
 * Type-to-search combobox with optional inline create-new. Replaces every
 * <Select> across the app where the option list is searchable and may grow.
 * The combobox renders an <input> when open so mobile keyboards launch
 * automatically · "+ Create new" footer item routes through onCreate.
 */
export function SmartSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  onCreate,
  createLabel = "Create new",
  disabled,
  inline,
  renderValue,
  className,
}: SmartSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();

  const filtered = useMemo(() => {
    if (!trimmedQuery) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(lowerQuery) ||
        (o.hint?.toLowerCase().includes(lowerQuery) ?? false),
    );
  }, [options, trimmedQuery, lowerQuery]);

  const showCreateRow =
    Boolean(onCreate) &&
    trimmedQuery.length > 0 &&
    !filtered.some((o) => o.label.toLowerCase() === lowerQuery);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={inline ? "ghost" : "outline"}
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {!selected && <Search className="h-3.5 w-3.5 shrink-0 opacity-60" />}
            {selected ? (renderValue ? renderValue(selected) : selected.label) : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 && !showCreateRow && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        opt.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{opt.label}</span>
                      {opt.hint && (
                        <span className="truncate text-xs text-muted-foreground">
                          {opt.hint}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreateRow && (
              <>
                {filtered.length > 0 && <CommandSeparator />}
                <CommandGroup>
                  <CommandItem
                    value={`__create__:${trimmedQuery}`}
                    onSelect={() => {
                      onCreate?.(trimmedQuery);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {createLabel} · <span className="ml-1 font-medium">{trimmedQuery}</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}