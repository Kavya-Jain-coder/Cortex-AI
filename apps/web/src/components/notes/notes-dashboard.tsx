"use client";

import { useMemo } from "react";
import { Menu, Sparkles, BookOpen, GraduationCap, Files, Activity } from "lucide-react";
import { useNotes } from "@/lib/hooks/use-notes";
import { useSubjects } from "@/lib/hooks/use-subjects";
import { useDocuments } from "@/lib/hooks/use-documents";
import { useNotesUIStore } from "@/store/notes-ui.store";
import { Button } from "@/components/ui/button";
import { NotesSidebar } from "./notes-sidebar";
import { NotesSearchBar } from "./notes-search-bar";
import { NotesFilterBar } from "./notes-filter-bar";
import { NotesGrid } from "./notes-grid";
import { NoteCreateDialog } from "./note-create-dialog";
import { PdfUploadZone } from "./pdf-upload-zone";
import type { Note } from "@studyos/shared/types";
import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/lib/utils";

export function NotesDashboard() {
  const selectedSubjectId = useNotesUIStore((s) => s.selectedSubjectId);
  const toggleSidebar = useNotesUIStore((s) => s.toggleSidebar);
  const isSidebarCollapsed = useNotesUIStore((s) => s.isSidebarCollapsed);

  const { data } = useNotes({
    subject_id: selectedSubjectId ?? undefined,
    page_size: 100,
  });

  const { data: subjects } = useSubjects();
  const { data: documents } = useDocuments(selectedSubjectId ?? undefined);

  // Derive unique tags from all visible notes for the filter bar
  const availableTags = useMemo(() => {
    const notes = (data?.data as Note[]) ?? [];
    const tagSet = new Set(notes.flatMap((n) => n.tags));
    return Array.from(tagSet).sort();
  }, [data]);

  const recentDocs = useMemo(() => {
    return (documents ?? []).slice(0, 3);
  }, [documents]);

  return (
    <div className="relative flex h-full overflow-hidden bg-background">
      {/* Mobile scrim overlay */}
      {!isSidebarCollapsed && (
        <div 
          className="fixed inset-0 z-10 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      <NotesSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="relative z-10 flex h-16 shrink-0 items-center gap-3 border-b border-border/80 bg-background/75 px-3 sm:px-5 backdrop-blur">
          <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <NotesSearchBar className="max-w-xs flex-1" />
          <div className="ml-auto flex items-center gap-2">
            <NoteCreateDialog />
          </div>
        </header>

        {/* Content */}
        <div className="flex flex-1 gap-0 overflow-hidden">
          {/* Notes main column */}
          <main className="flex-1 overflow-y-auto px-5 py-6">
            <div className="mx-auto max-w-6xl space-y-6">
              
              {/* Quick Workspace Stats Banner */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="premium-panel flex items-center gap-4 rounded-xl border p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading">{data?.data?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Total Notes</p>
                  </div>
                </div>

                <div className="premium-panel flex items-center gap-4 rounded-xl border p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading">{subjects?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Subjects Registered</p>
                  </div>
                </div>

                <div className="premium-panel flex items-center gap-4 rounded-xl border p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Files className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading">{documents?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Library Resources</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">All Notes</h2>
                </div>
                <NotesFilterBar availableTags={availableTags} />
                <NotesGrid />
              </div>
            </div>
          </main>

          {/* Right panel — PDF upload & resources list */}
          <aside className="hidden w-80 shrink-0 border-l border-border/80 bg-card/25 lg:flex lg:flex-col overflow-y-auto">
            <div className="p-4 space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Upload Material
                </p>
                <PdfUploadZone />
              </div>

              {/* Recent Files List */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Recent Resources
                </p>
                <div className="space-y-2">
                  {recentDocs.length > 0 ? (
                    recentDocs.map((doc) => (
                      <div key={doc.id} className="premium-panel flex flex-col gap-1 rounded-lg border p-3 bg-background/50 hover:bg-background/80 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-xs font-semibold leading-relaxed text-foreground">{doc.fileName}</p>
                          <Badge variant={doc.status === "ready" ? "secondary" : "outline"} className="text-[9px] px-1 py-0 h-4 shrink-0 uppercase">
                            {doc.status}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {formatFileSize(doc.sizeBytes)} · {doc.pageCount ?? 0} pages
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                      No files uploaded yet. Drag a PDF above to start indexing!
                    </div>
                  )}
                </div>
              </div>

              {/* RAG Context Notice */}
              <div className="premium-panel rounded-lg border p-3.5 bg-primary/[0.02]">
                <div className="flex gap-2.5">
                  <Activity className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">AI RAG Index Active</p>
                    <p className="text-[11px] leading-normal text-muted-foreground">
                      All uploaded materials are automatically converted to vector embeddings, enabling context-aware tutoring and exam predictions.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
