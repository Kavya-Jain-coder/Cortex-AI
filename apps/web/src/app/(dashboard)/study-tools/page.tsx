"use client";

import { useState, useEffect } from "react";
import { BrainCircuit, Loader2, Sparkles, Maximize2, Gamepad2, List } from "lucide-react";
import type { SearchScope } from "@studyos/shared/types";
import type { QuizQuestion } from "@/lib/api/study-tools";
import { useGenerateQuiz, usePredictions, useWeakTopics } from "@/lib/hooks/use-study-tools";
import { analyticsApi } from "@/lib/api/analytics";
import { useNotesUIStore } from "@/store/notes-ui.store";
import { SourceScopePanel } from "@/components/ai/source-scope-panel";
import { ChatMarkdown } from "@/components/ai/chat-markdown";
import { PageFrame } from "@/components/layout/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuizPlayer } from "@/components/study-tools/quiz-player";

type ToolMode = "quiz" | "weak-topics" | "predictions";

export default function StudyToolsPage() {
  const selectedSubjectId = useNotesUIStore((s) => s.selectedSubjectId);
  const [mode, setMode] = useState<ToolMode>("quiz");
  const [query, setQuery] = useState("important concepts for upcoming exam");
  const [count, setCount] = useState("8");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [scope, setScope] = useState<SearchScope>("all");
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [quizMode, setQuizMode] = useState<"play" | "review">("play");

  const quiz = useGenerateQuiz();
  const weakTopics = useWeakTopics();
  const predictions = usePredictions();

  const active = mode === "quiz" ? quiz : mode === "weak-topics" ? weakTopics : predictions;
  const data = active.data;

  useEffect(() => {
    // Record 1 minute of study time every 60 seconds
    const interval = setInterval(() => {
      analyticsApi.recordSession(1, selectedSubjectId === "NO_SUBJECT" ? null : selectedSubjectId).catch(console.error);
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedSubjectId]);

  const generate = () => {
    const payload = {
      query,
      count: Number(count) || 8,
      scope,
      subject_id: selectedSubjectId,
      source_ids: sourceIds,
      difficulty,
    };

    if (mode === "quiz") quiz.mutate(payload);
    if (mode === "weak-topics") weakTopics.mutate(payload);
    if (mode === "predictions") predictions.mutate(payload);
  };

  const quizQuestions: QuizQuestion[] =
    mode === "quiz" && data
      ? (data.items as unknown as QuizQuestion[]).filter(
          (q) => q.question && Array.isArray(q.options) && q.options.length >= 2 && q.answer
        )
      : [];

  const hasPlayableQuiz = quizQuestions.length > 0;

  return (
    <PageFrame
      title="AI Study Tools"
      description="Generate quizzes, weak-topic maps, and predicted exam questions from scoped RAG context."
      actions={<BrainCircuit className="h-5 w-5 text-muted-foreground" />}
    >
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-6 rounded-xl bg-card/50 p-5 shadow-sm border border-border/40">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Tool</label>
            <Select value={mode} onValueChange={(value) => setMode(value as ToolMode)}>
              <SelectTrigger className="bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quiz">Quiz generator</SelectItem>
                <SelectItem value="weak-topics">Weak-topic detection</SelectItem>
                <SelectItem value="predictions">Exam predictions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Focus</label>
            <Input className="bg-background/50 border-border/50" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Count</label>
              <Input className="bg-background/50 border-border/50" value={count} onChange={(e) => setCount(e.target.value)} type="number" min={1} max={20} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/30">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Retrieval Scope</label>
            <SourceScopePanel
              scope={scope}
              selectedSourceIds={sourceIds}
              onScopeChange={setScope}
              onSelectedSourceIdsChange={setSourceIds}
            />
          </div>

          <Button className="w-full gap-2 font-bold shadow-sm" size="lg" onClick={generate} disabled={active.isPending}>
            {active.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate
          </Button>
          {active.error instanceof Error && (
            <p className="text-xs text-destructive text-center">{active.error.message}</p>
          )}
        </aside>

        <section className="min-h-[600px] min-w-0 overflow-hidden rounded-xl border border-border/40 bg-card/30 p-8 flex flex-col shadow-sm">
          {!data ? (
            <div className="flex h-full flex-col justify-center py-6">
              <div className="text-center max-w-md mx-auto space-y-3">
                <Sparkles className="h-8 w-8 text-primary mx-auto animate-pulse" />
                <h3 className="text-base font-bold text-foreground">AI Study Copilot Ready</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select an AI Tool, specify your focus query, target your context, and click generate to synthesize your lectures, assignments, and notes.
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="premium-panel border rounded-xl p-4 bg-background/30 space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">01</div>
                  <h4 className="text-xs font-bold text-foreground">Quiz Generator</h4>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Create multiple-choice or short-answer questions tailored to specific subjects or uploaded documents to test your retention.
                  </p>
                </div>
                
                <div className="premium-panel border rounded-xl p-4 bg-background/30 space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">02</div>
                  <h4 className="text-xs font-bold text-foreground">Weak Topics</h4>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Analyze your study logs, query histories, and notes to automatically identify concepts needing review.
                  </p>
                </div>

                <div className="premium-panel border rounded-xl p-4 bg-background/30 space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">03</div>
                  <h4 className="text-xs font-bold text-foreground">Exam Predictions</h4>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Synthesize syllabus, notes, and past exam patterns to estimate question appearance probabilities for upcoming midterms.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col">
              {/* Header with mode toggle for quiz */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{mode}</Badge>
                <Badge variant="outline">{data.citations.length} citations</Badge>
                <Badge variant="outline">{String(data.retrievalMeta.fusedCount ?? 0)} chunks</Badge>

                {mode === "quiz" && hasPlayableQuiz && (
                  <div className="ml-auto flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
                    <button
                      type="button"
                      onClick={() => setQuizMode("play")}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        quizMode === "play"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Gamepad2 className="h-3.5 w-3.5" />
                      Take Quiz
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuizMode("review")}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        quizMode === "review"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <List className="h-3.5 w-3.5" />
                      View Answers
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                {mode === "quiz" && hasPlayableQuiz && quizMode === "play" ? (
                  <QuizPlayer
                    key={JSON.stringify(quizQuestions.map((q) => q.question))}
                    questions={quizQuestions}
                    onReset={() => {
                      quiz.reset();
                      setQuizMode("play");
                    }}
                  />
                ) : (
                  <div className="grid gap-5">
                    {data.items.map((item, index) => (
                      <ResultCard key={index} item={item as unknown as Record<string, unknown>} index={index} mode={mode} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </PageFrame>
  );
}

function ResultCard({
  item,
  index,
  mode,
}: {
  item: Record<string, unknown>;
  index: number;
  mode: ToolMode;
}) {
  const title =
    mode === "weak-topics"
      ? String(item.topic ?? `Topic ${index + 1}`)
      : String(item.question ?? `Item ${index + 1}`);

  const primary =
    mode === "quiz"
      ? String(item.answer ?? "")
      : mode === "weak-topics"
        ? String(item.reason ?? "")
        : String(item.rationale ?? "");

  const secondary =
    mode === "weak-topics"
      ? String(item.nextAction ?? "")
      : String(item.topic ?? item.sourceHint ?? "");
  const difficulty = item.difficulty ? String(item.difficulty) : "";
  const confidence =
    item.confidence !== undefined ? Math.round(Number(item.confidence) * 100) : null;

  return (
    <article className="rounded-xl border border-border bg-background p-5 relative group shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex gap-2 text-sm font-semibold leading-relaxed">
          <span className="shrink-0 text-muted-foreground">{index + 1}.</span>
          <ChatMarkdown content={title} className="[&>p]:inline [&>p]:mb-0" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {difficulty && <Badge variant="outline" className="capitalize bg-muted/40">{difficulty}</Badge>}
          {confidence !== null && <Badge variant="outline" className="bg-muted/40">{confidence}%</Badge>}
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-full hover:bg-muted/60">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border border-border/80 p-0 overflow-hidden">
              <DialogHeader className="px-6 py-4 border-b border-border/40 bg-muted/20">
                <DialogTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  Enlarged View — {mode === "quiz" ? "Quiz Question" : mode === "weak-topics" ? "Weak Topic" : "Predicted Question"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 px-6 py-6 overflow-y-auto max-h-[75vh]">
                <div className="text-lg font-bold leading-relaxed text-foreground">
                  <ChatMarkdown content={title} className="[&>p]:inline [&>p]:mb-0" />
                </div>
                
                {mode === "quiz" && Array.isArray(item.options) && item.options.length > 0 && (
                  <div className="grid gap-3">
                    {item.options.map((opt: string, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm hover:bg-muted/40 transition-colors"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <ChatMarkdown content={opt} className="[&>p]:inline [&>p]:mb-0" />
                      </div>
                    ))}
                  </div>
                )}
                
                {primary && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 mt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-3 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" />
                      {mode === "quiz" ? "Correct Answer" : "Explanation / Rationale"}
                    </p>
                    <div className="text-sm leading-relaxed text-foreground/90">
                      <ChatMarkdown content={primary} />
                    </div>
                  </div>
                )}
                
                {secondary && (
                  <div className="pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      {mode === "weak-topics" ? "Suggested Next Action" : "Topic Reference"}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {secondary}
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {mode === "quiz" && Array.isArray(item.options) && item.options.length > 0 && (
        <div className="mt-4 grid gap-2.5 pl-6">
          {item.options.map((opt: string, idx: number) => {
            const letter = String.fromCharCode(65 + idx);
            return (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs text-foreground hover:bg-muted/40 transition-colors"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[11px] font-bold text-primary">
                  {letter}
                </span>
                <ChatMarkdown content={opt} className="[&>p]:inline [&>p]:mb-0" />
              </div>
            );
          })}
        </div>
      )}

      {mode === "quiz" && primary && (
        <details className="mt-4 group pl-6">
          <summary className="text-[12px] font-medium text-primary/80 cursor-pointer select-none list-none flex items-center gap-1.5 hover:text-primary transition-colors">
            <span>Show Correct Answer</span>
          </summary>
          <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-600 dark:text-emerald-500 font-medium animate-in fade-in duration-200">
            <div className="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">Correct Answer</div>
            <ChatMarkdown content={primary} className="[&>p]:inline [&>p]:mb-0" />
          </div>
        </details>
      )}

      {mode !== "quiz" && primary && (
        <div className="text-sm leading-relaxed text-muted-foreground mt-4 pl-6">
          <ChatMarkdown content={primary} />
        </div>
      )}

      {secondary && mode !== "quiz" && (
        <p className="mt-3 text-xs text-muted-foreground/80 pl-6 border-l-2 border-border/60 ml-6 pl-3">
          {secondary}
        </p>
      )}
    </article>
  );
}

