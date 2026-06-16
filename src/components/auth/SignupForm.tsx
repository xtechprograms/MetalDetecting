"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  PENDING_MESSAGING_PIN_KEY,
  syncMessagingKeysFromPin,
  validateMessagingPin,
  type MessagingPinLength,
} from "@/lib/messengerCrypto";
import {
  Compass,
  Mail,
  Lock,
  User,
  AtSign,
  Loader2,
  AlertCircle,
  Shield,
} from "lucide-react";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pinLength, setPinLength] = useState<MessagingPinLength>(6);
  const [messagingPin, setMessagingPin] = useState("");
  const [confirmMessagingPin, setConfirmMessagingPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      setLoading(false);
      return;
    }

    const pinValidation = validateMessagingPin(messagingPin, pinLength);
    if (!pinValidation.valid) {
      setError(pinValidation.error || "Invalid messaging PIN");
      setLoading(false);
      return;
    }

    if (messagingPin !== confirmMessagingPin) {
      setError("Messaging PINs do not match");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase(),
          display_name: displayName || username,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          username: username.toLowerCase(),
          display_name: displayName || username,
        },
        { onConflict: "id" }
      );

      if (data.session) {
        try {
          await syncMessagingKeysFromPin(data.user.id, messagingPin, pinLength, supabase);
        } catch {
          sessionStorage.setItem(
            PENDING_MESSAGING_PIN_KEY,
            JSON.stringify({ pin: messagingPin, length: pinLength })
          );
        }
      } else {
        sessionStorage.setItem(
          PENDING_MESSAGING_PIN_KEY,
          JSON.stringify({ pin: messagingPin, length: pinLength })
        );
      }
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  if (success) {
    return (
      <div className="glass-card p-8 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
          <Compass className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="font-display text-2xl font-bold gold-gradient-text mb-2">
          Welcome, Detectorist!
        </h2>
        <p className="text-slate-400">
          Your account is ready. Remember your messaging PIN — you will need it to
          restore encrypted chats if you clear browser data.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-gold-500 to-bronze-500 flex items-center justify-center">
          <Compass className="w-7 h-7 text-slate-950" />
        </div>
        <h1 className="font-display text-2xl font-bold gold-gradient-text">
          Join Treasure Atlas
        </h1>
        <p className="text-slate-400 text-sm mt-2">
          Start logging your detecting adventures worldwide
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
          <label className="label-text" htmlFor="displayName">
            Display Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              id="displayName"
              type="text"
              className="input-field pl-11"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label-text" htmlFor="username">
            Username
          </label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              id="username"
              type="text"
              className="input-field pl-11"
              placeholder="detectorist_pro"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
            />
          </div>
        </div>

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
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gold-700/30 bg-gold-950/20 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gold-200">Messaging PIN</p>
              <p className="text-xs text-slate-400 mt-1">
                Direct messages are encrypted in your browser. This PIN protects a
                backup of your message keys on our server (encrypted with AES-GCM — we
                cannot read it without your PIN). If you clear browser data or switch
                devices, enter this PIN in Messages to restore your chat history.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPinLength(4);
                setMessagingPin("");
                setConfirmMessagingPin("");
              }}
              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                pinLength === 4
                  ? "border-gold-500 bg-gold-500/15 text-gold-300"
                  : "border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              4-digit PIN
            </button>
            <button
              type="button"
              onClick={() => {
                setPinLength(6);
                setMessagingPin("");
                setConfirmMessagingPin("");
              }}
              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                pinLength === 6
                  ? "border-gold-500 bg-gold-500/15 text-gold-300"
                  : "border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              6-digit PIN
            </button>
          </div>

          <div>
            <label className="label-text" htmlFor="messagingPin">
              Choose PIN ({pinLength} digits)
            </label>
            <input
              id="messagingPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              className="input-field tracking-[0.3em] text-center"
              placeholder={"•".repeat(pinLength)}
              value={messagingPin}
              onChange={(e) =>
                setMessagingPin(e.target.value.replace(/\D/g, "").slice(0, pinLength))
              }
              required
              minLength={pinLength}
              maxLength={pinLength}
            />
          </div>

          <div>
            <label className="label-text" htmlFor="confirmMessagingPin">
              Confirm PIN
            </label>
            <input
              id="confirmMessagingPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              className="input-field tracking-[0.3em] text-center"
              placeholder={"•".repeat(pinLength)}
              value={confirmMessagingPin}
              onChange={(e) =>
                setConfirmMessagingPin(e.target.value.replace(/\D/g, "").slice(0, pinLength))
              }
              required
              minLength={pinLength}
              maxLength={pinLength}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-gold-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
