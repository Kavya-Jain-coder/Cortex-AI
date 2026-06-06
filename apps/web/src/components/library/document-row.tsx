"use client";

import { FileText, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Document } from "@studyos/shared/types";
import { useDeleteDocument } from "@/lib/hooks/use-documents";
import { useIngestionStatus, useReindexDocument } from "@/lib/hooks/use-ingestion";
import { formatFileSize, formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DocumentRow({ document }: { document: Document }) {
  const deleteDocument = useDeleteDocument();
  const reindexDocument = useReindexDocument();
  const { data: status } = useIngestionStatus(
    document.id,
    document.status === "pending" || document.status === "processing"
  );

  const currentStatus = status?.status ?? document.status;

  const reindex = async () => {
    try {
      await reindexDocument.mutateAsync(document.id);
      toast.success("Document re-indexed");
    } catch (err) {
      toast.error("Re-index failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const remove = async () => {
    try {
      await deleteDocument.mutateAsync(document.id);
      toast.success("Document deleted");
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_110px] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{document.fileName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatFileSize(document.sizeBytes)} · {document.pageCount ?? status?.pageCount ?? 0} pages · {status?.chunkCount ?? 0} chunks
          </p>
        </div>
      </div>
      <Badge variant={currentStatus === "ready" ? "secondary" : currentStatus === "failed" ? "destructive" : "outline"}>
        {currentStatus}
      </Badge>
      <span className="text-xs text-muted-foreground">{formatRelativeTime(document.createdAt)}</span>
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" onClick={reindex} disabled={reindexDocument.isPending}>
          <RefreshCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={remove} disabled={deleteDocument.isPending}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
