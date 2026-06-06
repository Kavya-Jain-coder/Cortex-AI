"use client";

import { ArrowUpDown, X } from "lucide-react";
import { useNotesUIStore, type NoteTypeFilter, type NoteSortBy } from "@/store/notes-ui.store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TYPE_FILTERS: { label: string; value: NoteTypeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Typed", value: "typed" },
  { label: "Canvas", value: "canvas" },
];

const SORT_OPTIONS: { label: string; value: NoteSortBy }[] = [
  { label: "Last modified", value: "updated_at" },
  { label: "Created", value: "created_at" },
  { label: "Title A–Z", value: "title" },
];

// Derives unique tags from active notes — passed as prop to keep component pure
interface NotesFilterBarProps {
  availableTags?: string[];
}

export function NotesFilterBar({ availableTags = [] }: NotesFilterBarProps) {
  const typeFilter = useNotesUIStore((s) => s.typeFilter);
  const selectedTags = useNotesUIStore((s) => s.selectedTags);
  const sortBy = useNotesUIStore((s) => s.sortBy);
  const setTypeFilter = useNotesUIStore((s) => s.setTypeFilter);
  const toggleTag = useNotesUIStore((s) => s.toggleTag);
  const clearTags = useNotesUIStore((s) => s.clearTags);
  const setSortBy = useNotesUIStore((s) => s.setSortBy);

  const hasActiveFilters = typeFilter !== "all" || selectedTags.length > 0;

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sort";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Type filter chips */}
      <div className="flex items-center gap-1 rounded-md border border-primary/20 bg-card/80 p-0.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              typeFilter === f.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={typeFilter === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tag pills */}
      {availableTags.slice(0, 8).map((tag) => (
        <button
          key={tag}
          onClick={() => toggleTag(tag)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
            selectedTags.includes(tag)
              ? "bg-primary/10 border-primary text-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          )}
          aria-pressed={selectedTags.includes(tag)}
        >
          {tag}
        </button>
      ))}

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={() => {
            setTypeFilter("all");
            clearTags();
          }}
        >
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}

      {/* Sort dropdown — pushed to the right */}
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <ArrowUpDown className="h-3 w-3" />
              {currentSortLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={cn(sortBy === opt.value && "font-medium text-primary")}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
