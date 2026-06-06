import { AppNav } from "@/components/layout/app-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <AppNav />
      <div className="min-h-0 flex-1 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
        {children}
      </div>
    </div>
  );
}
