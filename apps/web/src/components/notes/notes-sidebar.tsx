"use client";

import { useState } from "react";
import { BookOpen, ChevronLeft, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useSubjects, useCreateSubject, useDeleteSubject } from "@/lib/hooks/use-subjects";
import { useNotesUIStore } from "@/store/notes-ui.store";
import { cn, SUBJECT_COLORS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { createSubjectSchema } from "@/lib/validations/note";

export function NotesSidebar() {
  const { data: subjects, isLoading } = useSubjects();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();

  const selectedSubjectId = useNotesUIStore((s) => s.selectedSubjectId);
  const isSidebarCollapsed = useNotesUIStore((s) => s.isSidebarCollapsed);
  const setSelectedSubject = useNotesUIStore((s) => s.setSelectedSubject);
  const toggleSidebar = useNotesUIStore((s) => s.toggleSidebar);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(SUBJECT_COLORS[0]);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateSubject = async () => {
    const result = createSubjectSchema.safeParse({
      name: subjectName,
      color: selectedColor,
    });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    await createSubject.mutateAsync(result.data);
    setSubjectName("");
    setSelectedColor(SUBJECT_COLORS[0]);
    setFormError(null);
    setDialogOpen(false);
  };

  return (
    <aside
      className={cn(
        "absolute inset-y-0 left-0 z-20 flex flex-col border-r border-border/80 bg-card/95 shadow-[inset_-1px_0_0_hsl(0_0%_100%/0.03)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:relative",
        isSidebarCollapsed ? "-translate-x-full md:translate-x-0 md:w-14" : "translate-x-0 w-64 md:w-60"
      )}
    >
      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3.5 top-5 z-10 h-7 w-7 rounded-full border border-primary/30 bg-background shadow-sm"
        onClick={toggleSidebar}
        aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            isSidebarCollapsed && "rotate-180"
          )}
        />
      </Button>

      <div className="flex h-16 items-center px-4">
        <BookOpen className="h-5 w-5 shrink-0 text-primary" />
        {!isSidebarCollapsed && (
          <span className="ml-2.5 font-heading text-xl font-bold tracking-normal text-foreground">
            Notes
          </span>
        )}
      </div>

      <ScrollArea className="flex-1 px-2">
        {/* All Notes */}
        <button
          onClick={() => setSelectedSubject(null)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm transition-all",
            "hover:bg-accent hover:text-accent-foreground",
            selectedSubjectId === null
              ? "border border-primary/25 bg-accent text-accent-foreground font-semibold"
              : "text-muted-foreground"
          )}
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          {!isSidebarCollapsed && <span>All Notes</span>}
        </button>

        {/* Subject divider */}
        {!isSidebarCollapsed && (
          <p className="mb-1 mt-4 px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Subjects
          </p>
        )}

        {/* Subjects list */}
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="mb-1.5 h-8 w-full rounded-md" />
            ))
          : subjects?.map((subject) => (
              <div key={subject.id} className="group relative">
                <button
                  onClick={() => setSelectedSubject(subject.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    selectedSubjectId === subject.id
                      ? "border border-primary/25 bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  {!isSidebarCollapsed && (
                    <span className="flex-1 truncate text-left">
                      {subject.name}
                    </span>
                  )}
                </button>

                {/* Delete subject — only visible on hover, not collapsed */}
                {!isSidebarCollapsed && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSubject.mutate(subject.id);
                    }}
                    aria-label={`Delete ${subject.name}`}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
      </ScrollArea>

      {/* Add subject */}
      {!isSidebarCollapsed && (
        <div className="border-t border-border/80 p-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
                <Plus className="h-4 w-4" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>New Subject</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="subject-name">Name</Label>
                  <Input
                    id="subject-name"
                    placeholder="e.g. Machine Learning"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateSubject()}
                  />
                  {formError && (
                    <p className="text-xs text-destructive">{formError}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {SUBJECT_COLORS.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          "h-6 w-6 rounded-full transition-all",
                          selectedColor === color && "ring-2 ring-offset-2 ring-ring scale-110"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedColor(color)}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateSubject}
                  disabled={createSubject.isPending}
                >
                  {createSubject.isPending ? "Creating…" : "Create Subject"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </aside>
  );
}
