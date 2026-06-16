"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { notifyMessengerFriendsChanged } from "@/lib/messenger";
import { UserPlus, Loader2, Check, Clock, X } from "lucide-react";

export function AddFriendButton({
  targetUserId,
  currentUserId,
  existingStatus,
}: {
  targetUserId: string;
  currentUserId: string;
  existingStatus: string | null;
}) {
  const [status, setStatus] = useState<string | null>(existingStatus);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const loadStatus = useCallback(async () => {
    const { data } = await supabase
      .from("friendships")
      .select("status")
      .or(
        `and(requester_id.eq.${currentUserId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${currentUserId})`
      )
      .maybeSingle();

    setStatus(data?.status ?? null);
  }, [currentUserId, targetUserId, supabase]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  if (targetUserId === currentUserId) return null;

  async function sendRequest() {
    setLoading(true);

    const { error } = await supabase.from("friendships").insert({
      requester_id: currentUserId,
      addressee_id: targetUserId,
      status: "pending",
    });

    if (!error || error.code === "23505") {
      setStatus("pending");
    } else {
      await loadStatus();
    }

    setLoading(false);
  }

  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full">
        <Check className="w-4 h-4" />
        Friends
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full">
        <Clock className="w-4 h-4" />
        Pending
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void sendRequest()}
      className="btn-primary text-sm py-2"
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      Add Friend
    </button>
  );
}

export function FriendRequestActions({
  friendshipId,
  onAccept,
  onDecline,
}: {
  friendshipId: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function accept() {
    setLoading(true);
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);

    if (!error) {
      notifyMessengerFriendsChanged();
      onAccept();
    }

    setLoading(false);
  }

  async function decline() {
    setLoading(true);
    const { error } = await supabase
      .from("friendships")
      .update({ status: "declined" })
      .eq("id", friendshipId);

    if (!error) {
      onDecline();
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void accept()}
        className="btn-primary text-xs py-1.5 px-3"
        disabled={loading}
      >
        <Check className="w-3 h-3" />
        Accept
      </button>
      <button
        type="button"
        onClick={() => void decline()}
        className="btn-secondary text-xs py-1.5 px-3"
        disabled={loading}
      >
        <X className="w-3 h-3" />
        Decline
      </button>
    </div>
  );
}
