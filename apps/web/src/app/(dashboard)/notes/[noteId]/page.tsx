import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { NoteEditor } from "@/components/notes/note-editor";

interface NotePageProps {
  params: Promise<{ noteId: string }>;
}

export const metadata: Metadata = {
  title: "Note",
};

export default async function NotePage({ params }: NotePageProps) {
  const { noteId } = await params;

  return (
    <Suspense fallback={<NotePageSkeleton />}>
      <NoteEditor noteId={noteId} />
    </Suspense>
  );
}

function NotePageSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 p-8">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-1/4" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}
