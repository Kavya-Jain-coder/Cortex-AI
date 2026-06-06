"use client";

import { useMemo, useState } from "react";
import { Bot, Loader2, Search, Send, Sparkles } from "lucide-react";
import type { ChatMessage, SearchResult, SearchScope } from "@studyos/shared/types";
import { useCreateChatSession, useSendChatMessage } from "@/lib/hooks/use-chat";
import { useHybridSearch } from "@/lib/hooks/use-search";
import { useNotesUIStore } from "@/store/notes-ui.store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SourceScopePanel } from "./source-scope-panel";
import { ChatMarkdown } from "./chat-markdown";

interface AiTutorPanelProps {
  currentNoteId?: string;
  className?: string;
}

export function AiTutorPanel({ currentNoteId, className }: AiTutorPanelProps) {
  const selectedSubjectId = useNotesUIStore((s) => s.selectedSubjectId);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [scope, setScope] = useState<SearchScope>("all");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(
    currentNoteId ? [currentNoteId] : []
  );
  const [prompt, setPrompt] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const createSession = useCreateChatSession();
  const sendMessage = useSendChatMessage();
  const hybridSearch = useHybridSearch();

  const scopedSourceIds = useMemo(() => selectedSourceIds, [selectedSourceIds]);

  const askTutor = async () => {
    const message = prompt.trim();
    if (!message) return;
    setPrompt("");

    const activeSession =
      sessionId ?? (await createSession.mutateAsync(selectedSubjectId)).id;
    setSessionId(activeSession);

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      sessionId: activeSession,
      role: "user",
      content: message,
      citations: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((old) => [...old, optimistic]);

    const response = await sendMessage.mutateAsync({
      sessionId: activeSession,
      payload: {
        message,
        scope,
        subject_id: selectedSubjectId,
        source_ids: scopedSourceIds,
      },
    });
    setMessages((old) => [...old, response.message]);
  };

  const runSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    const results = await hybridSearch.mutateAsync({
      query,
      scope,
      subject_id: selectedSubjectId,
      source_ids: scopedSourceIds,
      limit: 8,
    });
    setSearchResults(results);
  };

  return (
    <aside className={cn("flex h-full w-full flex-col border-l border-border bg-card", className)}>
      <div className="shrink-0 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">AI Tutor</h2>
            <p className="text-xs text-muted-foreground">Scoped RAG over your study material</p>
          </div>
        </div>
      </div>

      <div className="shrink-0 space-y-4 border-b border-border p-4">
        <SourceScopePanel
          scope={scope}
          selectedSourceIds={selectedSourceIds}
          onScopeChange={setScope}
          onSelectedSourceIdsChange={setSelectedSourceIds}
          currentNoteId={currentNoteId}
        />

        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Semantic search"
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button type="button" size="icon" variant="outline" onClick={runSearch} disabled={hybridSearch.isPending}>
            {hybridSearch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Search Hits
            </div>
            {searchResults.map((result) => (
              <div key={result.id} className="rounded-lg border border-border bg-background p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold">{result.title || result.sourceType}</p>
                  <Badge variant="outline" className="text-[10px]">{result.sourceType}</Badge>
                </div>
                <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{result.excerpt}</p>
              </div>
            ))}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Ask for explanations, quizzes, weak-topic review, or predicted exam questions using only the selected sources.
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-lg p-3 text-sm leading-relaxed",
                message.role === "user"
                  ? "ml-6 bg-primary text-primary-foreground"
                  : "mr-6 border border-border bg-background"
              )}
            >
              {message.role === "assistant" ? (
                <ChatMarkdown content={message.content} />
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
              {message.citations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {message.citations.slice(0, 4).map((citation, index) => (
                    <Badge key={`${citation.sourceId}-${index}`} variant="outline" className="text-[10px]">
                      [{index + 1}] {citation.title}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) askTutor();
            }}
            placeholder="Ask Cortex..."
            className="min-h-20 min-w-0 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Button type="button" size="icon" onClick={askTutor} disabled={sendMessage.isPending || createSession.isPending}>
            {sendMessage.isPending || createSession.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
