"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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
  const [status, setStatus] = useState(existingStatus);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setStatus(existingStatus);
  }, [existingStatus]);

  if (targetUserId === currentUserId) return null;

  async function sendRequest() {
    setLoading(true);
    const { error } = await supabase.from("friendships").insert({
      requester_id: currentUserId,
      addressee_id: targetUserId,
      status: "pending",
    });
    if (!error) setStatus("pending");
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
    <button onClick={sendRequest} className="btn-primary text-sm py-2" disabled={loading}>
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
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    onAccept();
    setLoading(false);
  }

  async function decline() {
    setLoading(true);
    await supabase
      .from("friendships")
      .update({ status: "declined" })
      .eq("id", friendshipId);
    onDecline();
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={accept}
        className="btn-primary text-xs py-1.5 px-3"
        disabled={loading}
      >
        <Check className="w-3 h-3" />
        Accept
      </button>
      <button
        onClick={decline}
        className="btn-secondary text-xs py-1.5 px-3"
        disabled={loading}
      >
        <X className="w-3 h-3" />
        Decline
      </button>
    </div>
  );
}
