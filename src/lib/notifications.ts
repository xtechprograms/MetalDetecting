import type { Notification, NotificationType } from "@/types/database";
import {
  Compass,
  Heart,
  MessageSquare,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export function getNotificationHref(notification: Notification): string {
  switch (notification.type) {
    case "friend_request":
      return "/community";
    case "friend_accepted":
    case "friend_find":
      return notification.actor?.username
        ? `/profile/${notification.actor.username}`
        : "/community";
    case "forum_thread_reply":
    case "forum_thread_like":
    case "friend_forum_thread":
      return notification.thread_id
        ? `/forum/thread/${notification.thread_id}`
        : "/forum";
    case "forum_post_reply":
    case "forum_post_like":
    case "friend_forum_post":
      return notification.thread_id
        ? `/forum/thread/${notification.thread_id}${notification.post_id ? `#post-${notification.post_id}` : ""}`
        : "/forum";
    default:
      return "/notifications";
  }
}

export function getNotificationIcon(type: NotificationType): LucideIcon {
  switch (type) {
    case "friend_request":
      return UserPlus;
    case "friend_accepted":
      return UserCheck;
    case "friend_forum_thread":
    case "friend_forum_post":
      return Users;
    case "friend_find":
      return Compass;
    case "forum_thread_reply":
    case "forum_post_reply":
      return MessageSquare;
    case "forum_thread_like":
    case "forum_post_like":
      return Heart;
    default:
      return MessageSquare;
  }
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
