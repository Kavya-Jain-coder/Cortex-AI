import type { Metadata } from "next";
import { NotesDashboard } from "@/components/notes/notes-dashboard";

export const metadata: Metadata = {
  title: "Notes",
};

export default function NotesPage() {
  return <NotesDashboard />;
}
