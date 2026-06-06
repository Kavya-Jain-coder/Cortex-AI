"use client";

import { BarChart3, BookOpen, Bot, Clock, Files } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAnalyticsSummary } from "@/lib/hooks/use-analytics";
import { PageFrame } from "@/components/layout/page-frame";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsPage() {
  const { data, isLoading, isError } = useAnalyticsSummary();

  return (
    <PageFrame title="Analytics" description="Study activity, content volume, and subject coverage.">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : isError || !data ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-destructive">Failed to load analytics</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={<Clock className="h-4 w-4" />} label="Study minutes" value={data.totalStudyMinutes} />
            <Metric icon={<BookOpen className="h-4 w-4" />} label="Notes" value={data.totalNotes} />
            <Metric icon={<Files className="h-4 w-4" />} label="Documents" value={data.totalDocuments} />
            <Metric icon={<Bot className="h-4 w-4" />} label="Chat turns" value={data.totalChatMessages} />
          </div>

          <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Weekly Activity</h2>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklyActivity?.length ? data.weeklyActivity : Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return { date: d.toISOString().split('T')[0], minutes: 0 };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Subject Coverage</h2>
              <div className="space-y-3">
                {data.subjectBreakdown.length > 0 ? data.subjectBreakdown.map((subject) => (
                  <div key={subject.subjectId} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{subject.subjectName}</p>
                      <span className="text-xs text-muted-foreground">{subject.noteCount} notes</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{subject.studyMinutes} study minutes</p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">Create subjects to see coverage.</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </PageFrame>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
