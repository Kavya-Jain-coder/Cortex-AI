"use client";

import { FileText, MoreHorizontal, PenLine, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Note } from "@studyos/shared/types";
import { useDeleteNote } from "@/lib/hooks/use-notes";
import { useSubjects } from "@/lib/hooks/use-subjects";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NoteCardProps {
  note: Note;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export function NoteCard({ note, isSelected, onSelect }: NoteCardProps) {
  const deleteNote = useDeleteNote();
  const { data: subjects } = useSubjects();

  const subject = subjects?.find((s) => s.id === note.subjectId);
  const NoteIcon = note.type === "canvas" ? PenLine : FileText;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteNote.mutateAsync(note.id);
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  return (
    <div className="group relative">
      {onSelect && (
        <button
          className={cn(
            "absolute left-2 top-2 z-10 h-4 w-4 rounded border transition-all",
            "border-border bg-background opacity-0 group-hover:opacity-100",
            isSelected && "opacity-100 bg-primary border-primary"
          )}
          onClick={(e) => { e.preventDefault(); onSelect(note.id); }}
          aria-label={`Select note "${note.title}"`}
        />
      )}

      <Link
        href={`/notes/${note.id}`}
        className={cn(
          "premium-panel flex h-full min-h-36 flex-col gap-3 rounded-lg border p-4 text-card-foreground transition-all duration-300 ease-out",
          "hover:-translate-y-1 hover:scale-[1.02] hover:border-primary/50 hover:shadow-[0_30px_70px_hsl(0_0%_0%/0.4),0_0_0_1px_hsl(43_96%_57%/0.25)]",
          "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both",
          isSelected && "border-primary ring-1 ring-primary/35"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                note.type === "canvas"
                  ? "border border-primary/25 bg-primary/10 text-primary"
                  : "border border-primary/25 bg-primary/10 text-primary"
              )}
            >
              <NoteIcon className="h-3.5 w-3.5" />
            </span>
            <h3 className="truncate text-sm font-semibold leading-tight">
              {note.title}
            </h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.preventDefault()}
                aria-label="Note options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
                disabled={deleteNote.isPending}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {note.content && (
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {extractPlainText(note.content)}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {subject && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: `${subject.color}20`,
                  color: subject.color,
                }}
              >
                {subject.name}
              </span>
            )}
            {note.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full text-[10px] px-2 py-0">
                {tag}
              </Badge>
            ))}
            {note.tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{note.tags.length - 2}
              </span>
            )}
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatRelativeTime(note.updatedAt)}
          </span>
        </div>
      </Link>
    </div>
  );
}

function extractPlainText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.content) return extractFromDoc(parsed.content);
    return "";
  } catch {
    return content.slice(0, 150);
  }
}

function extractFromDoc(nodes: unknown[]): string {
  if (!Array.isArray(nodes)) return "";
  return nodes
    .flatMap((node: any) => {
      if (node.type === "text") return node.text ?? "";
      if (node.content) return extractFromDoc(node.content);
      return "";
    })
    .join(" ")
    .slice(0, 150);
}
