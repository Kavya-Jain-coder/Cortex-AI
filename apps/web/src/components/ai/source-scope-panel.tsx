"use client";

import { FileText, Layers3, PenLine } from "lucide-react";
import type { Document, Note, SearchScope } from "@studyos/shared/types";
import { useDocuments } from "@/lib/hooks/use-documents";
import { useNotes } from "@/lib/hooks/use-notes";
import { useNotesUIStore } from "@/store/notes-ui.store";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SourceScopePanelProps {
  scope: SearchScope;
  selectedSourceIds: string[];
  onScopeChange: (scope: SearchScope) => void;
  onSelectedSourceIdsChange: (ids: string[]) => void;
  currentNoteId?: string;
}

const scopeOptions: Array<{ value: SearchScope; label: string }> = [
  { value: "all", label: "All" },
  { value: "notes", label: "Notes" },
  { value: "documents", label: "Docs" },
  { value: "assignments", label: "Work" },
];

export function SourceScopePanel({
  scope,
  selectedSourceIds,
  onScopeChange,
  onSelectedSourceIdsChange,
  currentNoteId,
}: SourceScopePanelProps) {
  const selectedSubjectId = useNotesUIStore((s) => s.selectedSubjectId);
  const { data: notesData } = useNotes({
    subject_id: selectedSubjectId ?? undefined,
    page_size: 50,
  });
  const { data: documents } = useDocuments(selectedSubjectId ?? undefined);

  const notes = notesData?.data ?? [];
  const visibleNotes = scope === "all" || scope === "notes" ? notes : [];
  const visibleDocs = scope === "all" || scope === "documents" ? documents ?? [] : [];

  const toggleSource = (id: string) => {
    onSelectedSourceIdsChange(
      selectedSourceIds.includes(id)
        ? selectedSourceIds.filter((sourceId) => sourceId !== id)
        : [...selectedSourceIds, id]
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
        {scopeOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={scope === option.value ? "secondary" : "ghost"}
            className="h-7 rounded-md px-2 text-xs"
            onClick={() => {
              onScopeChange(option.value);
              onSelectedSourceIdsChange([]);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
        {visibleNotes.map((note) => (
          <SourceRow
            key={note.id}
            id={note.id}
            title={note.title}
            meta={formatRelativeTime(note.updatedAt)}
            active={selectedSourceIds.includes(note.id)}
            icon={note.type === "canvas" ? <PenLine className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            onToggle={toggleSource}
          />
        ))}

        {visibleDocs.map((doc: Document) => (
          <SourceRow
            key={doc.id}
            id={doc.id}
            title={doc.fileName}
            meta={doc.status}
            active={selectedSourceIds.includes(doc.id)}
            icon={<Layers3 className="h-3.5 w-3.5" />}
            badge={doc.status}
            onToggle={toggleSource}
          />
        ))}

        {visibleNotes.length === 0 && visibleDocs.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            No selectable sources in this scope yet.
          </div>
        )}
      </div>
    </div>
  );
}

function SourceRow({
  id,
  title,
  meta,
  active,
  icon,
  badge,
  onToggle,
}: {
  id: string;
  title: string;
  meta: string;
  active: boolean;
  icon: React.ReactNode;
  badge?: string;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border p-2 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
      )}
      onClick={() => onToggle(id)}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{meta}</span>
      </span>
      {badge && <Badge variant="outline" className="shrink-0 text-[10px]">{badge}</Badge>}
    </button>
  );
}
