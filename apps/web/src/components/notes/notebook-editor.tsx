"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Trash2, Code2, Type } from "lucide-react";
import CodeEditor from "@uiw/react-textarea-code-editor";
import { cn } from "@/lib/utils";
import { NotebookBlock } from "@/lib/utils/notebook-parser";
import { Button } from "@/components/ui/button";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.css";

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

const MarkdownViewer = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
  { ssr: false }
);

interface NotebookEditorProps {
  blocks: NotebookBlock[];
  onChange: (blocks: NotebookBlock[]) => void;
}

export function NotebookEditor({ blocks, onChange }: NotebookEditorProps) {
  
  const updateBlock = (id: string, updates: Partial<NotebookBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBlock = (id: string) => {
    const newBlocks = blocks.filter(b => b.id !== id);
    if (newBlocks.length === 0) {
      newBlocks.push({ id: Math.random().toString(), type: "text", content: "" });
    }
    onChange(newBlocks);
  };

  const addBlock = (index: number, type: "text" | "code") => {
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, {
      id: Math.random().toString(),
      type,
      content: "",
      language: type === "code" ? "python" : undefined,
    });
    onChange(newBlocks);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 pb-64">
      <div className="mx-auto max-w-4xl space-y-4">
        {blocks.map((block, i) => (
          <div key={block.id} className="group relative">
            
            {/* The Add Block Interstitial (Top of first block) */}
            {i === 0 && (
              <AddBlockBar onAdd={(type) => addBlock(-1, type)} />
            )}

            <div className="relative rounded-lg border border-transparent transition-colors focus-within:border-border hover:border-border/50 group-hover:bg-muted/10 p-2">
              
              {/* Delete Button */}
              <button
                onClick={() => deleteBlock(block.id)}
                className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"
                title="Delete Block"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {block.type === "code" ? (
                <div className="rounded-md overflow-hidden border border-border bg-muted/30 pt-1">
                  <div className="flex items-center px-3 py-1.5 bg-muted/50 border-b border-border text-xs font-mono text-muted-foreground">
                    <Code2 className="h-3.5 w-3.5 mr-2" />
                    <input 
                      value={block.language || ""}
                      onChange={(e) => updateBlock(block.id, { language: e.target.value })}
                      placeholder="language (e.g. python)"
                      className="bg-transparent border-none outline-none w-32 focus:text-foreground"
                    />
                  </div>
                  <CodeEditor
                    value={block.content}
                    language={block.language}
                    onChange={(evn) => updateBlock(block.id, { content: evn.target.value })}
                    padding={16}
                    minHeight={80}
                    style={{
                      fontSize: 14,
                      backgroundColor: "transparent",
                      fontFamily: "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
                    }}
                  />
                </div>
              ) : (
                <TextBlock 
                  content={block.content} 
                  onChange={(content) => updateBlock(block.id, { content })} 
                />
              )}
            </div>

            {/* The Add Block Interstitial (Bottom) */}
            <AddBlockBar onAdd={(type) => addBlock(i, type)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AddBlockBar({ onAdd }: { onAdd: (type: "text" | "code") => void }) {
  return (
    <div className="opacity-0 hover:opacity-100 py-3 -my-3 relative z-20 flex justify-center items-center transition-opacity">
      <div className="absolute inset-x-0 h-px bg-border top-1/2 -translate-y-1/2" />
      <div className="relative bg-background px-2 flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs rounded-full shadow-sm" onClick={() => onAdd("text")}>
          <Type className="h-3 w-3 mr-1.5" /> + Text
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs rounded-full shadow-sm" onClick={() => onAdd("code")}>
          <Code2 className="h-3 w-3 mr-1.5" /> + Code
        </Button>
      </div>
    </div>
  );
}

function TextBlock({ content, onChange }: { content: string, onChange: (c: string) => void }) {
  const [isEditing, setIsEditing] = useState(content === "");

  if (isEditing) {
    return (
      <div className="border border-border rounded-md overflow-hidden shadow-sm pt-2" data-color-mode="dark">
        <MDEditor
          value={content}
          onChange={(val) => onChange(val || "")}
          preview="edit"
          height="auto"
          minHeight={100}
          className="w-full !bg-background border-none"
          textareaProps={{
            placeholder: "Type markdown here...",
            onBlur: () => {
              if (content.trim() !== "") setIsEditing(false);
            }
          }}
        />
        <div className="bg-muted/50 px-3 py-1.5 flex justify-end border-t border-border">
          <Button size="sm" variant="secondary" className="h-6 text-xs" onClick={() => setIsEditing(false)}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      onDoubleClick={() => setIsEditing(true)}
      className="prose prose-invert max-w-none cursor-text p-2 min-h-[60px]"
    >
      <div className="text-xs text-muted-foreground/50 mb-1 font-mono tracking-widest select-none">Double-click to edit text</div>
      <div data-color-mode="dark">
        <MarkdownViewer 
          source={content || "*Empty text block*"} 
          rehypePlugins={[rehypeKatex]}
          remarkPlugins={[remarkMath]}
          style={{ backgroundColor: 'transparent' }}
        />
      </div>
    </div>
  );
}
