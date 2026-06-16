"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applyPendingMessagingPin } from "@/lib/messengerCrypto";
import { Compass, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

export function LoginForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      try {
        await applyPendingMessagingPin(data.user.id, supabase);
      } catch {
        // Pending PIN setup can be completed in Messages after email confirmation.
      }
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="glass-card p-8 animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-gold-500 to-bronze-500 flex items-center justify-center">
          <Compass className="w-7 h-7 text-slate-950" />
        </div>
        <h1 className="font-display text-2xl font-bold gold-gradient-text">
          Welcome Back
        </h1>
        <p className="text-slate-400 text-sm mt-2">
          Sign in to continue your detecting journey
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-6 rounded-xl bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-text" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              id="email"
              type="email"
              className="input-field pl-11"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="label-text" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              id="password"
              type="password"
              className="input-field pl-11"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        New to Treasure Atlas?{" "}
        <Link href="/signup" className="text-gold-400 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
