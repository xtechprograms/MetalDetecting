"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";

export function NotificationsList({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select(
        "*, actor:profiles!actor_id(username, display_name, avatar_url)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  function handleNotificationRead(notificationId: string) {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId
          ? { ...item, read_at: item.read_at ?? new Date().toISOString() }
          : item
      )
    );
  }

  async function markAllRead() {
    setMarkingAll(true);
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);

    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      }))
    );
    setMarkingAll(false);
  }

  async function clearNotificationHistory() {
    setClearingHistory(true);
    setClearError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("clear_notification_history");

    if (error) {
      setClearError("Could not clear notification history. Please try again.");
      setClearingHistory(false);
      return;
    }

    setNotifications([]);
    setShowClearConfirm(false);
    setClearingHistory(false);
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold-400" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">
          You&apos;re all caught up. Friend requests, forum posts, logged finds, replies, and reactions will show up here.
        </p>
        <Link href="/groups" className="btn-primary mt-6 inline-flex">
          Find detectorists
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={markingAll || clearingHistory}
            className="btn-secondary text-sm py-2"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Mark all read
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowClearConfirm(true)}
          disabled={clearingHistory}
          className="btn-secondary text-sm py-2 text-red-300 hover:text-red-200 hover:border-red-900/50"
        >
          {clearingHistory ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Clear history
        </button>
      </div>

      {showClearConfirm && (
        <div className="glass-card px-4 py-3 border border-red-900/40 bg-red-950/30">
          <p className="text-sm text-red-200/90">
            Permanently delete all notifications? This cannot be undone.
          </p>
          {clearError && (
            <p className="text-xs text-red-400 mt-2">{clearError}</p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => void clearNotificationHistory()}
              disabled={clearingHistory}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50"
            >
              {clearingHistory ? "Clearing..." : "Delete all"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowClearConfirm(false);
                setClearError(null);
              }}
              disabled={clearingHistory}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="glass-card divide-y divide-slate-700/50">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            userId={userId}
            onRead={handleNotificationRead}
          />
        ))}
      </div>
    </div>
  );
}
