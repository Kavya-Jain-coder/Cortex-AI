"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/ui/password-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const next = searchParams?.get("next") || "/notes";

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error("Could not sign in", { description: error.message });
      return;
    }

    router.replace(next as "/notes");
    router.refresh();
  };

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to access your engineering notes, LaTeX documents, and AI tutor."
      footer={
        <>
          New to Cortex?{" "}
          <Link
            href="/auth/signup"
            className="text-amber-400/90 underline underline-offset-2 transition-colors hover:text-amber-300"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={login}>
        {/* Email */}
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-[0.78rem] font-medium uppercase tracking-widest text-zinc-400"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="block h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white placeholder:text-zinc-600 transition-all focus:border-amber-500/40 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-[0.78rem] font-medium uppercase tracking-widest text-zinc-400"
            >
              Password
            </label>
            <Link
              href="/auth/reset-password"
              className="text-[0.72rem] text-zinc-500 transition-colors hover:text-amber-400"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-11 rounded-lg border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-amber-500/30"
          />
        </div>

        {/* CTA Button */}
        <button
          type="submit"
          disabled={loading}
          className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-sm font-bold uppercase tracking-wider text-black shadow-[0_4px_24px_rgba(245,180,40,0.25)] transition-all duration-200 hover:shadow-[0_6px_32px_rgba(245,180,40,0.35)] hover:brightness-110 disabled:opacity-50 disabled:hover:shadow-none"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </AuthCard>
  );
}
