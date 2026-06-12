"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/ui/password-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const signup = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const origin = window.location.origin;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/notes`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);

    if (error) {
      toast.error("Could not create account", { description: error.message });
      return;
    }

    toast.success("Check your email to confirm your account");
    router.push("/auth/login" as "/auth/login");
  };

  const inputClasses =
    "block h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white placeholder:text-zinc-600 transition-all focus:border-amber-500/40 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-amber-500/30";

  return (
    <AuthCard
      title="Create account"
      description="The ultimate AI workspace built exclusively for Engineering Students."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-amber-400/90 underline underline-offset-2 transition-colors hover:text-amber-300"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={signup}>
        {/* Name */}
        <div className="space-y-2">
          <label
            htmlFor="full-name"
            className="block text-[0.78rem] font-medium uppercase tracking-widest text-zinc-400"
          >
            Name
          </label>
          <input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            placeholder="Your full name"
            className={inputClasses}
          />
        </div>

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
            className={inputClasses}
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-[0.78rem] font-medium uppercase tracking-widest text-zinc-400"
          >
            Password
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
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
              Create account
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </AuthCard>
  );
}
