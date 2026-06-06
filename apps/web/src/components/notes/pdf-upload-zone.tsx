"use client";

import { useCallback, useRef } from "react";
import { FileUp, Loader2, Upload } from "lucide-react";
import { useUploadDocument } from "@/lib/hooks/use-documents";
import { useNotesUIStore } from "@/store/notes-ui.store";
import { cn, formatFileSize } from "@/lib/utils";
import { toast } from "sonner";

const ACCEPTED_TYPES = ["application/pdf"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

interface PdfUploadZoneProps {
  className?: string;
}

export function PdfUploadZone({ className }: PdfUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadDocument = useUploadDocument();
  const isDragOver = useNotesUIStore((s) => s.isDragOver);
  const selectedSubjectId = useNotesUIStore((s) => s.selectedSubjectId);
  const setDragOver = useNotesUIStore((s) => s.setDragOver);
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const invalid = fileArray.filter((f) => !ACCEPTED_TYPES.includes(f.type));
      const oversized = fileArray.filter((f) => f.size > MAX_SIZE_BYTES);

      if (invalid.length > 0) {
        toast.error("Only PDF files are supported");
        return;
      }
      if (oversized.length > 0) {
        toast.error(
          `File exceeds 50 MB limit (${formatFileSize(oversized[0]!.size)})`
        );
        return;
      }

      for (const file of fileArray) {
        try {
          await uploadDocument.mutateAsync({
            file,
            subjectId: selectedSubjectId,
          });
          toast.success(`"${file.name}" uploaded — processing…`);
        } catch (err) {
          toast.error(
            `Failed to upload "${file.name}"`,
            { description: err instanceof Error ? err.message : undefined }
          );
        }
      }
    },
    [uploadDocument, selectedSubjectId, toast]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles, setDragOver]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload PDF — click or drag and drop"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "premium-panel flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6",
        "transition-all duration-200",
        isDragOver
          ? "border-primary bg-primary/10 text-primary glow-golden"
          : "border-primary/25 hover:border-primary/60 hover:bg-accent/45 text-muted-foreground",
        uploadDocument.isPending && "pointer-events-none opacity-60",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        aria-hidden
      />
      {uploadDocument.isPending ? (
        <Loader2 className="h-7 w-7 animate-spin" />
      ) : isDragOver ? (
        <FileUp className="h-7 w-7" />
      ) : (
        <Upload className="h-7 w-7" />
      )}
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">
          {uploadDocument.isPending
            ? "Uploading…"
            : isDragOver
              ? "Drop PDF here"
              : "Upload PDF"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">Drag & drop or click · Max 50 MB</p>
      </div>
    </div>
  );
}
