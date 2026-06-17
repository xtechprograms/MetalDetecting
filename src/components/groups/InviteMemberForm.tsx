"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, UserPlus } from "lucide-react";

export function InviteMemberForm({
  groupId,
  userId,
  embedded = false,
}: {
  groupId: string;
  userId: string;
  embedded?: boolean;
}) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = username.trim().replace(/^@/, "").toLowerCase();
    if (!trimmed || loading) return;

    setLoading(true);
    setMessage(null);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", trimmed)
      .maybeSingle();

    if (!profile) {
      setMessage("No user found with that username.");
      setLoading(false);
      return;
    }

    if (profile.id === userId) {
      setMessage("You cannot invite yourself.");
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("group_members")
      .select("id, status")
      .eq("group_id", groupId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (existing?.status === "active") {
      setMessage("That user is already in the group.");
      setLoading(false);
      return;
    }

    if (existing) {
      const { error } = await supabase
        .from("group_members")
        .update({ status: "invited", invited_by: userId })
        .eq("id", existing.id);

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(`Invitation sent to @${profile.username}.`);
        setUsername("");
      }
    } else {
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: profile.id,
        role: "member",
        status: "invited",
        invited_by: userId,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(`Invitation sent to @${profile.username}.`);
        setUsername("");
      }
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className={embedded ? "p-4 sm:p-5" : "glass-card p-4 sm:p-5 mb-6"}
    >
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-gold-400" />
        Invite a member
      </h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="@username"
          className="input-field flex-1 min-w-0"
        />
        <button type="submit" disabled={loading} className="btn-primary min-h-[44px] shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
        </button>
      </div>
      {message && <p className="text-sm text-slate-400 mt-2">{message}</p>}
    </form>
  );
}
