"use client";

import { useEffect, useRef } from "react";
import { Tldraw, type Editor, getSnapshot, loadSnapshot } from "tldraw";

import { useTheme } from "next-themes";

interface CanvasNoteEditorProps {
  value: string | null;
  onChange: (snapshot: string) => void;
}

export function CanvasNoteEditor({ value, onChange }: CanvasNoteEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const loadedValueRef = useRef<string | null>(null);
  const { theme, systemTheme } = useTheme();

  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !value || loadedValueRef.current === value) return;

    try {
      loadSnapshot(editor.store, JSON.parse(value));
      loadedValueRef.current = value;
    } catch {
      loadedValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.user.updateUserPreferences({ colorScheme: isDark ? "dark" : "light" });
    }
  }, [isDark]);

  return (
    <div className="relative flex-1 h-full min-h-0 overflow-hidden border-t border-border bg-background touch-none">
      <Tldraw
        persistenceKey={undefined}
        onMount={(editor) => {
          editorRef.current = editor;
          if (value) {
            try {
              loadSnapshot(editor.store, JSON.parse(value));
              loadedValueRef.current = value;
            } catch {
              loadedValueRef.current = value;
            }
          }

          editor.store.listen(
            () => {
              const snapshot = JSON.stringify(getSnapshot(editor.store));
              loadedValueRef.current = snapshot;
              onChange(snapshot);
            },
            { scope: "document", source: "user" }
          );
        }}
      />
    </div>
  );
}
