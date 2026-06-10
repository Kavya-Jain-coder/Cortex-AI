"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Bot, FileText, Loader2, Save, Tags, X, Download } from "lucide-react";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.css";
import { toast } from "sonner";
import { useNote, useUpdateNote } from "@/lib/hooks/use-notes";
import { useSubjects } from "@/lib/hooks/use-subjects";
import { analyticsApi } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";
import { parseMarkdownToBlocks, serializeBlocksToMarkdown, NotebookBlock } from "@/lib/utils/notebook-parser";
import { NotebookEditor } from "./notebook-editor";
import { AiTutorPanel } from "@/components/ai/ai-tutor-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NoteEditorProps {
  noteId: string;
}

const NO_SUBJECT = "__none__";

const CanvasNoteEditor = dynamic(
  () => import("./canvas-note-editor").then((mod) => mod.CanvasNoteEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center border-t border-border">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

export function NoteEditor({ noteId }: NoteEditorProps) {
  const { data: note, isLoading, isError, error } = useNote(noteId);
  const { data: subjects } = useSubjects();
  const updateNote = useUpdateNote();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [blocks, setBlocks] = useState<NotebookBlock[]>([]);
  const [canvasData, setCanvasData] = useState<any>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tutorOpen, setTutorOpen] = useState(false);

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setContent(note.content ?? "");
    setBlocks(parseMarkdownToBlocks(note.content ?? ""));
    setCanvasData(note.canvasData);
    setSubjectId(note.subjectId);
    setTags(note.tags ?? []);
  }, [note]);

  const dirty = useMemo(() => {
    if (!note) return false;
    return (
      title !== note.title ||
      content !== (note.content ?? "") ||
      canvasData !== note.canvasData ||
      subjectId !== note.subjectId ||
      tags.join("\u0000") !== (note.tags ?? []).join("\u0000")
    );
  }, [canvasData, content, note, subjectId, tags, title]);

  const save = async () => {
    if (!note) return;
    try {
      await updateNote.mutateAsync({
        noteId: note.id,
        payload: {
          title: title.trim() || "Untitled",
          content: note.type === "typed" ? content : note.content ?? "",
          canvas_data: note.type === "canvas" ? canvasData ?? "" : note.canvasData ?? "",
          subject_id: subjectId,
          tags,
        },
      });
      toast.success("Note saved and indexed");
    } catch (err) {
      toast.error("Failed to save note", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  useEffect(() => {
    // Record 1 minute of study time every 60 seconds
    const interval = setInterval(() => {
      analyticsApi.recordSession(1, subjectId === NO_SUBJECT ? null : subjectId).catch(console.error);
    }, 60000);
    return () => clearInterval(interval);
  }, [subjectId]);

  const handleBlocksChange = (newBlocks: NotebookBlock[]) => {
    setBlocks(newBlocks);
    setContent(serializeBlocksToMarkdown(newBlocks));
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (!tag || tags.includes(tag)) {
      setTagInput("");
      return;
    }
    setTags([...tags, tag]);
    setTagInput("");
  };

  const handleExport = () => {
    if (!note) return;
    
    // Strip out the raw Canvas JSON state so the markdown file looks clean
    const cleanContent = content.replace(/<!-- CORTEX_CANVAS: .*? -->/gs, "");
    
    const blob = new Blob([cleanContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.trim() || "Untitled"}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !note) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm font-semibold text-destructive">Could not load note</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "Please go back and try again."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/notes" aria-label="Back to notes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <FileText className="h-4 w-4" />
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
            placeholder="Untitled note"
          />
          {note.type === "typed" && (
            <Button
              type="button"
              onClick={handleExport}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export Markdown
            </Button>
          )}
          <Button
            type="button"
            onClick={save}
            disabled={!dirty || updateNote.isPending}
            className={cn("gap-2", dirty && "glow-golden")}
          >
            {updateNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>

          {/* AI Tutor toggle button */}
          <Button
            type="button"
            variant={tutorOpen ? "secondary" : "outline"}
            size="icon"
            onClick={() => setTutorOpen((prev) => !prev)}
            aria-label={tutorOpen ? "Close AI Tutor" : "Open AI Tutor"}
            className={cn(
              "relative shrink-0 transition-colors",
              tutorOpen && "bg-primary/10 text-primary border-primary/30"
            )}
          >
            <Bot className="h-4 w-4" />
            {!tutorOpen && (
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
            )}
          </Button>
        </header>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <Select
            value={subjectId ?? NO_SUBJECT}
            onValueChange={(value) => setSubjectId(value === NO_SUBJECT ? null : value)}
          >
            <SelectTrigger className="h-8 w-48">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SUBJECT}>No subject</SelectItem>
              {(subjects ?? []).map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Tags className="h-4 w-4 shrink-0 text-muted-foreground" />
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTags(tags.filter((item) => item !== tag))}
                aria-label={`Remove ${tag}`}
              >
                <Badge variant="secondary" className="text-[11px]">#{tag}</Badge>
              </button>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
              className="h-8 min-w-28 flex-1 bg-transparent text-sm outline-none"
              placeholder="Add tags"
            />
          </div>
        </div>

        {note.type === "canvas" ? (
          <CanvasNoteEditor value={canvasData} onChange={setCanvasData} />
        ) : (
          <NotebookEditor blocks={blocks} onChange={handleBlocksChange} />
        )}
      </main>

      {/* Collapsible AI Tutor Panel */}
      <div
        className={cn(
          "shrink-0 overflow-hidden border-l border-border transition-all duration-300 ease-in-out",
          tutorOpen ? "w-[380px]" : "w-0 border-l-0"
        )}
      >
        <div className="relative h-full w-[380px]">
          {/* Close button inside the panel */}
          <button
            type="button"
            onClick={() => setTutorOpen(false)}
            className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close AI Tutor"
          >
            <X className="h-4 w-4" />
          </button>
          <AiTutorPanel currentNoteId={note.id} />
        </div>
      </div>
    </div>
  );
}

