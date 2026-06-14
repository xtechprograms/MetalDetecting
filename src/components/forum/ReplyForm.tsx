"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";

export function ReplyForm({ threadId, isLocked }: { threadId: string; isLocked: boolean }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  if (isLocked) {
    return (
      <div className="glass-card p-6 text-center text-slate-500 text-sm">
        This thread is locked — no new replies allowed.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sign in to reply");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("forum_posts").insert({
      thread_id: threadId,
      user_id: user.id,
      content: content.trim(),
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setContent("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
      <h3 className="font-display font-semibold text-slate-200">Post a Reply</h3>
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      <textarea
        className="input-field min-h-[120px] resize-y"
        placeholder="Write your reply..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        minLength={2}
      />
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reply"}
      </button>
    </form>
  );
}
