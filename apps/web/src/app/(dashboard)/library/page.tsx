"use client";

import { Upload } from "lucide-react";
import { useDocuments } from "@/lib/hooks/use-documents";
import { useNotesUIStore } from "@/store/notes-ui.store";
import { DocumentRow } from "@/components/library/document-row";
import { PageFrame } from "@/components/layout/page-frame";
import { PdfUploadZone } from "@/components/notes/pdf-upload-zone";
import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryPage() {
  const selectedSubjectId = useNotesUIStore((s) => s.selectedSubjectId);
  const { data: documents, isLoading, isError } = useDocuments(selectedSubjectId ?? undefined);

  return (
    <PageFrame
      title="Library"
      description="Uploaded PDFs, slides, assignments, and past papers that feed the retrieval pipeline."
      actions={<Upload className="h-5 w-5 text-muted-foreground" />}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_110px] gap-4 border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span>Document</span>
            <span>Status</span>
            <span>Added</span>
            <span className="text-right">Actions</span>
          </div>
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : isError ? (
            <div className="p-8 text-center text-sm text-destructive">Failed to load documents</div>
          ) : documents && documents.length > 0 ? (
            documents.map((doc) => <DocumentRow key={doc.id} document={doc} />)
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">No documents uploaded yet.</div>
          )}
        </section>
        <aside className="space-y-3">
          <PdfUploadZone />
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            PDFs are stored in Supabase, chunked semantically, mirrored into PostgreSQL full-text search, and indexed in Qdrant for scoped retrieval.
          </div>
        </aside>
      </div>
    </PageFrame>
  );
}
