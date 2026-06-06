"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/update-password`,
    });
    setLoading(false);

    if (error) {
      toast.error("Could not send reset email", { description: error.message });
      return;
    }

    toast.success("Password reset email sent");
  };

  return (
    <AuthCard
      title="Reset password"
      description="Send a password reset link to your email."
      footer={<Link href="/auth/login" className="font-medium text-foreground underline">Back to sign in</Link>}
    >
      <form className="space-y-4" onSubmit={reset}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <Button className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
