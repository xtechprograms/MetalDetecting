"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";
import {
  formatNotificationTime,
  getNotificationHref,
  getNotificationIcon,
} from "@/lib/notifications";
import { FriendRequestActions } from "@/components/community/FriendActions";

type NotificationItemProps = {
  notification: Notification;
  userId: string;
  compact?: boolean;
  onRead?: (notificationId: string) => void;
  onRemove?: (notificationId: string) => void;
  onAction?: () => void;
};

export function NotificationItem({
  notification,
  userId,
  compact = false,
  onRead,
  onRemove,
  onAction,
}: NotificationItemProps) {
  const router = useRouter();
  const supabase = createClient();
  const Icon = getNotificationIcon(notification.type);
  const unread = !notification.read_at;

  async function markAsRead() {
    if (notification.read_at) return;

    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notification.id)
      .eq("user_id", userId);

    onRead?.(notification.id);
  }

  async function handleNavigate() {
    await markAsRead();
    onAction?.();
    router.push(getNotificationHref(notification));
  }

  async function handleFriendRequestResolved() {
    await markAsRead();
    onRemove?.(notification.id);
    onAction?.();
  }

  const padding = compact ? "px-3 py-3" : "p-4 sm:p-5";
  const unreadClass = unread
    ? compact
      ? "bg-gold-500/10"
      : "bg-gold-500/5"
    : "";

  if (notification.type === "friend_request" && notification.friendship_id) {
    return (
      <div
        className={`${padding} transition-colors ${unreadClass} ${
          compact ? "rounded-xl" : ""
        }`}
      >
        <div className={`flex items-start gap-3 ${compact ? "" : "gap-4"}`}>
          {notification.actor?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={notification.actor.avatar_url}
              alt=""
              className={`${compact ? "w-9 h-9 rounded-lg" : "w-10 h-10 rounded-xl"} object-cover shrink-0`}
            />
          ) : (
            <div
              className={`${compact ? "w-9 h-9 rounded-lg" : "w-10 h-10 rounded-xl"} bg-slate-800 flex items-center justify-center shrink-0`}
            >
              <Icon className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-gold-400`} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              {notification.actor?.username ? (
                <Link
                  href={`/profile/${notification.actor.username}`}
                  onClick={() => {
                    onAction?.();
                  }}
                  className={`${compact ? "font-medium text-sm" : "font-semibold text-sm sm:text-base"} hover:text-gold-400 transition-colors`}
                >
                  {notification.title}
                </Link>
              ) : (
                <p className={compact ? "font-medium text-sm" : "font-semibold text-sm sm:text-base"}>
                  {notification.title}
                </p>
              )}
              {unread && (
                <span className="w-2 h-2 rounded-full bg-gold-400 shrink-0 mt-2" />
              )}
            </div>
            {notification.body && (
              <p className={`text-slate-400 mt-0.5 ${compact ? "text-xs line-clamp-2" : "text-sm"}`}>
                {notification.body}
              </p>
            )}
            <p className={`text-slate-500 mt-1 ${compact ? "text-[11px]" : "text-xs"}`}>
              {formatNotificationTime(notification.created_at)}
            </p>
            <div className="mt-2">
              <FriendRequestActions
                friendshipId={notification.friendship_id}
                onAccept={() => void handleFriendRequestResolved()}
                onDecline={() => void handleFriendRequestResolved()}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleNavigate()}
      className={`w-full text-left flex items-start gap-3 ${padding} transition-colors min-h-[44px] hover:bg-slate-800/50 ${
        unread ? `${unreadClass} hover:bg-gold-500/10` : ""
      } ${compact ? "rounded-xl gap-3" : "gap-4 sm:gap-4"}`}
    >
      {compact ? (
        notification.actor?.avatar_url ? (
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
        )
      ) : (
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-gold-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={`${compact ? "font-medium text-sm truncate" : "font-semibold text-sm sm:text-base"}`}>
            {notification.title}
          </p>
          {unread && (
            <span className="w-2 h-2 rounded-full bg-gold-400 shrink-0 mt-2" />
          )}
        </div>
        {notification.body && (
          <p className={`text-slate-400 mt-0.5 ${compact ? "text-xs line-clamp-2" : "text-sm"}`}>
            {notification.body}
          </p>
        )}
        <p className={`text-slate-500 mt-1 ${compact ? "text-[11px]" : "text-xs sm:text-sm"}`}>
          {formatNotificationTime(notification.created_at)}
        </p>
      </div>
    </button>
  );
}
