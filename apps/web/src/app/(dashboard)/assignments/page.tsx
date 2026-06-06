"use client";

import { useState } from "react";
import { Calendar, ClipboardList, Plus, Trash2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import type { AssignmentType } from "@studyos/shared/types";
import { useAssignments, useCreateAssignment, useDeleteAssignment } from "@/lib/hooks/use-assignments";
import { useDocuments } from "@/lib/hooks/use-documents";
import { useSubjects } from "@/lib/hooks/use-subjects";
import { PageFrame } from "@/components/layout/page-frame";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";

const NO_SUBJECT = "__none__";

export default function AssignmentsPage() {
  const { data: assignments, isLoading } = useAssignments();
  const { data: documents } = useDocuments();
  const { data: subjects } = useSubjects();
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AssignmentType>("assignment");
  const [documentId, setDocumentId] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [year, setYear] = useState("");

  const create = async () => {
    if (!title.trim() || !documentId) {
      toast.error("Title and document are required");
      return;
    }

    try {
      await createAssignment.mutateAsync({
        title: title.trim(),
        type,
        document_id: documentId,
        subject_id: subjectId,
        year: year ? Number(year) : null,
        tags: type === "pyq" ? ["pyq"] : [],
      });
      setTitle("");
      setType("assignment");
      setDocumentId("");
      setSubjectId(null);
      setYear("");
      setOpen(false);
      toast.success("Assignment saved");
    } catch (err) {
      toast.error("Could not create assignment", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <PageFrame
      title="Assignments"
      description="Classify uploaded assignments, practice sets, and PYQs for exam-aware retrieval."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Assignment Source</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Midterm PYQ 2024" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(value) => setType(value as AssignmentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="pyq">Previous year</SelectItem>
                      <SelectItem value="practice">Practice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Year</Label>
                  <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" type="number" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Document</Label>
                <Select value={documentId} onValueChange={setDocumentId}>
                  <SelectTrigger><SelectValue placeholder="Choose uploaded PDF" /></SelectTrigger>
                  <SelectContent>
                    {(documents ?? []).map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>{doc.fileName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Select value={subjectId ?? NO_SUBJECT} onValueChange={(value) => setSubjectId(value === NO_SUBJECT ? null : value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUBJECT}>No subject</SelectItem>
                    {(subjects ?? []).map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={create} disabled={createAssignment.isPending}>
                {createAssignment.isPending ? "Saving..." : "Save source"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-lg border border-border bg-card h-fit">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : assignments && assignments.length > 0 ? (
            assignments.map((assignment) => {
              const subject = subjects?.find((item) => item.id === assignment.subjectId);
              return (
                <div key={assignment.id} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{assignment.title}</p>
                      <Badge variant={assignment.type === "pyq" ? "secondary" : "outline"}>{assignment.type}</Badge>
                      {subject && <Badge variant="outline">{subject.name}</Badge>}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {assignment.year ?? "No year"} · document {assignment.documentId.slice(0, 8)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAssignment.mutate(assignment.id)}
                    disabled={deleteAssignment.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">No assignments or PYQs classified yet.</div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="premium-panel rounded-lg border p-4 bg-card">
            <h3 className="font-semibold text-sm mb-2 text-foreground flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-primary" /> Why Classify Materials?
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              By tagging files as Assignments, PYQs (Previous Year Questions), or Practice Sets, the AI study assistant is able to cross-reference academic patterns specifically designed for your curriculum.
            </p>
          </div>
          <div className="premium-panel rounded-lg border p-4 bg-card">
            <h3 className="font-semibold text-sm mb-2 text-foreground flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-amber-500" /> Exam Predictions
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Once tagged, head over to <strong>AI Tools</strong> and choose <strong>Exam Predictions</strong>. The AI will cross-reference your lectures and assignments to predict potential exam questions with confidence rates.
            </p>
          </div>
        </aside>
      </div>
    </PageFrame>
  );
}
