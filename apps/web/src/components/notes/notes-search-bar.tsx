"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useNotesUIStore } from "@/store/notes-ui.store";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface NotesSearchBarProps {
  className?: string;
}

export function NotesSearchBar({ className }: NotesSearchBarProps) {
  const setSearchQuery = useNotesUIStore((s) => s.setSearchQuery);
  const activeQuery = useNotesUIStore((s) => s.searchQuery);

  const [localValue, setLocalValue] = useState(activeQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(localValue);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localValue, setSearchQuery]);

  // Keep local in sync if store is cleared externally
  useEffect(() => {
    if (activeQuery === "") setLocalValue("");
  }, [activeQuery]);

  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder="Search notes…"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="h-10 border-primary/20 bg-card/80 pl-9 pr-8 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]"
        aria-label="Search notes"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 h-6 w-6"
          onClick={() => setLocalValue("")}
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
