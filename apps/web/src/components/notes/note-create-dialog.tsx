"use client";

import { useState } from "react";
import { FileText, PenLine, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateNote } from "@/lib/hooks/use-notes";
import { useSubjects } from "@/lib/hooks/use-subjects";
import { useNotesUIStore } from "@/store/notes-ui.store";
import { cn } from "@/lib/utils";
import { createNoteSchema } from "@/lib/validations/note";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NoteType = "typed" | "canvas";

const NOTE_TYPES: { type: NoteType; label: string; description: string; icon: typeof FileText }[] =
  [
    { type: "typed", label: "Typed Note", description: "Rich text editor", icon: FileText },
    { type: "canvas", label: "Canvas Note", description: "Infinite drawing canvas", icon: PenLine },
  ];

export function NoteCreateDialog() {
  const router = useRouter();
  const createNote = useCreateNote();
  const { data: subjects } = useSubjects();
  const selectedSubjectId = useNotesUIStore((s) => s.selectedSubjectId);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("typed");
  const [subjectId, setSubjectId] = useState<string | null>(selectedSubjectId);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags((prev) => [...prev, tag]);
      setTagInput("");
    }
  };

  const handleSubmit = async () => {
    const result = createNoteSchema.safeParse({ title, type: noteType, subject_id: subjectId, tags });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        const key = String(i.path[0] ?? "title");
        fieldErrors[key] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const note = await createNote.mutateAsync(result.data);
      setOpen(false);
      resetForm();
      router.push(`/notes/${note.id}`);
    } catch (err) {
      toast.error("Failed to create note", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const resetForm = () => {
    setTitle("");
    setNoteType("typed");
    setTags([]);
    setTagInput("");
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              placeholder="Untitled note"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            {errors["title"] && (
              <p className="text-xs text-destructive">{errors["title"]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {NOTE_TYPES.map(({ type, label, description, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setNoteType(type)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors",
                    noteType === type
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                  aria-pressed={noteType === type}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{label}</span>
                  <span className="text-xs opacity-70">{description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Subject (optional)</Label>
            <Select
              value={subjectId ?? "none"}
              onValueChange={(v) => setSubjectId(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No subject</SelectItem>
                {subjects?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tags (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {tag}
                    <button
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createNote.isPending}
          >
            {createNote.isPending ? "Creating…" : "Create Note"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
