"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Trophy, RotateCcw, ChevronRight, Sparkles, Download } from "lucide-react";
import type { QuizQuestion } from "@/lib/api/study-tools";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onReset?: () => void;
}

type AnswerState = "idle" | "correct" | "wrong";

interface QuestionState {
  selected: number | null;
  state: AnswerState;
  revealed: boolean;
}

/* ─── Confetti Particle ─── */
function ConfettiParticle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <span
      className="pointer-events-none absolute animate-confetti-burst"
      style={{
        left: `${x}%`,
        top: "40%",
        animationDelay: `${delay}ms`,
        color,
        fontSize: "1.2rem",
      }}
    >
      ✦
    </span>
  );
}

/* ─── Score Popup ─── */
function ScorePopup({ text }: { text: string }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 animate-score-pop text-lg font-extrabold text-emerald-400">
      {text}
    </span>
  );
}

/* ─── Main Component ─── */
export function QuizPlayer({ questions, onReset }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [states, setStates] = useState<QuestionState[]>(
    () => questions.map(() => ({ selected: null, state: "idle", revealed: false }))
  );
  const [showResults, setShowResults] = useState(false);

  const question = questions[currentIndex];
  const qState = states[currentIndex];
  if (!question || !qState) return null;
  const totalAnswered = states.filter((s) => s.revealed).length;
  const totalCorrect = states.filter((s) => s.state === "correct").length;

  const correctIndex = useMemo(() => {
    if (!question) return -1;
    return question.options.findIndex(
      (opt) => opt.trim().toLowerCase() === question.answer.trim().toLowerCase()
    );
  }, [question]);

  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (qState.revealed) return;

      const isCorrect = optionIndex === correctIndex;
      setStates((prev) => {
        const next = [...prev];
        next[currentIndex] = {
          selected: optionIndex,
          state: isCorrect ? "correct" : "wrong",
          revealed: true,
        };
        return next;
      });
    },
    [qState.revealed, correctIndex, currentIndex]
  );

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setShowResults(true);
    }
  };

  const restart = () => {
    setCurrentIndex(0);
    setStates(questions.map(() => ({ selected: null, state: "idle", revealed: false })));
    setShowResults(false);
  };

  const handleExportAnki = () => {
    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
    const csvContent = questions.map(q => `${escapeCsv(q.question)},${escapeCsv(q.answer)}`).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "flashcards.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ─── Results Screen ─── */
  if (showResults) {
    const percent = Math.round((totalCorrect / questions.length) * 100);
    const emoji = percent >= 80 ? "🏆" : percent >= 50 ? "💪" : "📖";
    const message =
      percent >= 80
        ? "Outstanding! You've mastered this material!"
        : percent >= 50
          ? "Good effort! Review the missed questions."
          : "Keep studying — you'll get there!";

    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12">
        <div className="relative">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary/30 bg-primary/5">
            <span className="text-4xl">{emoji}</span>
          </div>
          {percent >= 80 && (
            <>
              {([0, 1, 2, 3, 4, 5] as const).map((i) => {
                const colors = ["#f59e0b", "#10b981", "#3b82f6", "#f43f5e", "#8b5cf6", "#ec4899"];
                return (
                  <ConfettiParticle
                    key={i}
                    delay={i * 100}
                    x={10 + i * 15}
                    color={colors[i] ?? "#f59e0b"}
                  />
                );
              })}
            </>
          )}
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-extrabold text-foreground">
            {totalCorrect} / {questions.length}
          </h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-border bg-muted/30 px-6 py-2.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-500">{totalCorrect}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">{questions.length - totalCorrect}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-semibold text-foreground">{percent}%</span>
        </div>

        {/* Per-question summary */}
        <div className="w-full max-w-lg space-y-2">
          {questions.map((q, i) => {
            const s = states[i];
            if (!s) return null;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2 text-xs",
                  s.state === "correct"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-red-400/20 bg-red-400/5"
                )}
              >
                {s.state === "correct" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                )}
                <span className="truncate text-foreground">{q.question}</span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={restart} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Retry Quiz
          </Button>
          <Button variant="outline" onClick={handleExportAnki} className="gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:text-primary text-primary">
            <Download className="h-4 w-4" /> Export Anki (CSV)
          </Button>
          {onReset && (
            <Button variant="outline" onClick={onReset} className="gap-2">
              <Sparkles className="h-4 w-4" /> New Quiz
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ─── Quiz Question View ─── */
  return (
    <div className="flex h-full flex-col">
      {/* Progress bar */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question <span className="font-bold text-foreground">{currentIndex + 1}</span> of{" "}
            {questions.length}
          </span>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-semibold text-emerald-500">{totalCorrect}</span>
            <XCircle className="h-3.5 w-3.5 text-red-400" />
            <span className="font-semibold text-red-400">{totalAnswered - totalCorrect}</span>
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + (qState.revealed ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-6 space-y-2">
        <Badge variant="outline" className="capitalize">
          {question.difficulty}
        </Badge>
        <h2 className="text-lg font-bold leading-snug text-foreground">{question.question}</h2>
      </div>

      {/* Options */}
      <div
        className={cn(
          "relative grid gap-3",
          qState.state === "correct" && "animate-boom-correct",
          qState.state === "wrong" && "animate-shake-wrong"
        )}
      >
        {/* Floating score popup on correct */}
        {qState.state === "correct" && <ScorePopup text="+1 🎉" />}

        {question.options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = qState.selected === idx;
          const isCorrectOption = idx === correctIndex;
          const revealed = qState.revealed;

          let optionStyle = "border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/40 cursor-pointer";

          if (revealed) {
            if (isCorrectOption) {
              optionStyle = "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30";
            } else if (isSelected && !isCorrectOption) {
              optionStyle = "border-red-400/50 bg-red-400/10 ring-1 ring-red-400/30";
            } else {
              optionStyle = "border-border/30 bg-muted/10 opacity-50 cursor-default";
            }
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(idx)}
              disabled={revealed}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all duration-200",
                optionStyle
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                  revealed && isCorrectOption
                    ? "bg-emerald-500 text-white"
                    : revealed && isSelected && !isCorrectOption
                      ? "bg-red-400 text-white"
                      : "bg-primary/10 text-primary"
                )}
              >
                {revealed && isCorrectOption ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : revealed && isSelected && !isCorrectOption ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  letter
                )}
              </span>
              <span className="flex-1 leading-relaxed">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback message */}
      {qState.revealed && (
        <div
          className={cn(
            "mt-4 rounded-lg border p-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
            qState.state === "correct"
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-red-400/20 bg-red-400/5"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            {qState.state === "correct" ? (
              <>
                <Trophy className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-500">Correct! 🎉</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm font-bold text-red-400">Not quite! 😅</span>
              </>
            )}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Answer:</span> {question.answer}
          </p>
        </div>
      )}

      {/* Navigation */}
      {qState.revealed && (
        <div className="mt-4 flex justify-end animate-in fade-in-0 duration-300">
          <Button onClick={goNext} className="gap-2">
            {currentIndex < questions.length - 1 ? (
              <>
                Next Question <ChevronRight className="h-4 w-4" />
              </>
            ) : (
              <>
                See Results <Trophy className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
