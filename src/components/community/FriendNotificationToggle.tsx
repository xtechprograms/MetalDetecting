"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, BellOff, Loader2 } from "lucide-react";

type FriendNotificationToggleProps = {
  currentUserId: string;
  friendUserId: string;
  friendName: string;
};

export function FriendNotificationToggle({
  currentUserId,
  friendUserId,
  friendName,
}: FriendNotificationToggleProps) {
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadMuteState() {
      const { data } = await supabase
        .from("friend_notification_mutes")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("muted_user_id", friendUserId)
        .maybeSingle();

      setMuted(!!data);
      setLoading(false);
    }

    loadMuteState();
  }, [currentUserId, friendUserId]);

  async function toggleMute() {
    setSaving(true);
    const supabase = createClient();

    if (muted) {
      const { error } = await supabase
        .from("friend_notification_mutes")
        .delete()
        .eq("user_id", currentUserId)
        .eq("muted_user_id", friendUserId);

      if (!error) setMuted(false);
    } else {
      const { error } = await supabase.from("friend_notification_mutes").insert({
        user_id: currentUserId,
        muted_user_id: friendUserId,
      });

      if (!error) setMuted(true);
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-slate-500 px-3 py-1.5">
        <Loader2 className="w-4 h-4 animate-spin" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleMute}
      disabled={saving}
      className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border transition-colors min-h-[44px] ${
        muted
          ? "text-slate-400 bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60"
          : "text-gold-300 bg-gold-500/10 border-gold-500/30 hover:bg-gold-500/15"
      }`}
      aria-pressed={!muted}
      title={
        muted
          ? `Turn notifications back on for ${friendName}`
          : `Stop notifications when ${friendName} posts or logs finds`
      }
    >
      {saving ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : muted ? (
        <BellOff className="w-4 h-4" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      {muted ? "Notifications off" : "Notifications on"}
    </button>
  );
}
