"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { BarChart3, BookOpen, BrainCircuit, Files, GraduationCap, LogOut, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/notes", label: "Notes", icon: BookOpen },
  { href: "/library", label: "Library", icon: Files },
  { href: "/assignments", label: "Assignments", icon: GraduationCap },
  { href: "/study-tools", label: "AI Tools", icon: BrainCircuit },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase.auth]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/auth/login" as "/auth/login");
    router.refresh();
  };

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border/80 bg-card/95 px-4 shadow-[0_1px_0_hsl(0_0%_100%/0.04),0_18px_60px_hsl(0_0%_0%/0.28)] backdrop-blur">
      <Link href="/notes" className="mr-4 flex items-center">
        <Image
          src="/images/logo-transparent.png"
          alt="Cortex Logo"
          width={130}
          height={35}
          className="object-contain"
        />
      </Link>
      <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                active && "border border-primary/25 bg-accent font-semibold text-accent-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-2 pl-3">
        {user && (
          <div className="hidden min-w-0 items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-1 sm:flex">
            <UserCircle className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-40 truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
