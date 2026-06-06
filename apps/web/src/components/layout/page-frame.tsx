import { cn } from "@/lib/utils";

export function PageFrame({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="h-full overflow-y-auto bg-background">
      <div className={cn("mx-auto flex min-h-full max-w-7xl flex-col gap-6 p-6", className)}>
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-bold tracking-normal text-golden">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </main>
  );
}
