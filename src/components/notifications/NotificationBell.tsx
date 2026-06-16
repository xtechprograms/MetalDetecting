"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";
import {
  formatNotificationTime,
  getNotificationHref,
  getNotificationIcon,
} from "@/lib/notifications";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";

type NotificationBellProps = {
  userId: string;
};

export function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select(
        "*, actor:profiles!actor_id(username, display_name, avatar_url)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);

    const items = (data as Notification[]) ?? [];
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.read_at).length);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function markAsRead(notification: Notification) {
    if (notification.read_at) return;

    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notification.id)
      .eq("user_id", userId);

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id
          ? { ...item, read_at: new Date().toISOString() }
          : item
      )
    );
    setUnreadCount((count) => Math.max(count - 1, 0));
  }

  async function handleNotificationClick(notification: Notification) {
    await markAsRead(notification);
    setOpen(false);
    router.push(getNotificationHref(notification));
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
    setUnreadCount(0);
    setMarkingAll(false);
  }

  async function clearNotificationHistory() {
    setClearingHistory(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("clear_notification_history");

    if (!error) {
      setNotifications([]);
      setUnreadCount(0);
      setShowClearConfirm(false);
    }

    setClearingHistory(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="relative flex items-center justify-center min-h-11 min-w-11 p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] glass-card p-2 z-[100] animate-fade-in shadow-xl"
        >
          <div className="flex items-center justify-between px-2 py-2 border-b border-slate-700/50 mb-2">
            <p className="font-semibold text-sm">Notifications</p>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={markingAll || clearingHistory}
                  className="inline-flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 px-2 py-1 rounded-lg"
                >
                  {markingAll ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3 h-3" />
                  )}
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm((value) => !value)}
                  disabled={clearingHistory}
                  className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg"
                  aria-label="Clear notification history"
                  title="Clear history"
                >
                  {clearingHistory ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>

          {showClearConfirm && notifications.length > 0 && (
            <div className="mx-2 mb-2 px-3 py-2 rounded-xl border border-red-900/40 bg-red-950/30">
              <p className="text-xs text-red-200/90">
                Delete all notifications permanently?
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => void clearNotificationHistory()}
                  disabled={clearingHistory}
                  className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-500 disabled:opacity-50"
                >
                  {clearingHistory ? "Clearing..." : "Delete all"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearingHistory}
                  className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-gold-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-slate-500">
              No notifications yet
            </div>
          ) : (
            <div className="max-h-[min(24rem,60dvh)] overflow-y-auto theme-scrollbar space-y-1">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const unread = !notification.read_at;

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-colors min-h-[44px] ${
                      unread
                        ? "bg-gold-500/10 hover:bg-gold-500/15"
                        : "hover:bg-slate-800/50"
                    }`}
                  >
                    {notification.actor?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={notification.actor.avatar_url}
                        alt=""
                        className="w-9 h-9 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-gold-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notification.title}</p>
                      {notification.body && (
                        <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>
                    {unread && (
                      <span className="w-2 h-2 rounded-full bg-gold-400 shrink-0 mt-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-slate-700/50 mt-2 pt-2 px-1">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-sm text-gold-400 hover:text-gold-300 py-2 rounded-lg hover:bg-slate-800/40"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
