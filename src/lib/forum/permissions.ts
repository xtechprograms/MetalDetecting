import type { ForumReportReason, ForumReportStatus, Profile, UserRole } from "@/types/database";

export function canModerate(role: UserRole | undefined | null): boolean {
  return role === "mod" || role === "admin";
}

export function isAdmin(role: UserRole | undefined | null): boolean {
  return role === "admin";
}

export function isModerator(role: UserRole | undefined | null): boolean {
  return role === "mod";
}

/** Moderation panel link — mods only; admins use the admin panel instead */
export function showModerationPanel(role: UserRole | undefined | null): boolean {
  return role === "mod";
}

export type ForumRestrictionProfile = Pick<
  Profile,
  "forum_banned" | "forum_suspended_until" | "forum_moderation_reason"
>;

export function isForumPostingAllowed(
  profile: ForumRestrictionProfile | null | undefined
): boolean {
  if (!profile) return false;
  if (profile.forum_banned) return false;
  if (profile.forum_suspended_until) {
    return new Date(profile.forum_suspended_until) <= new Date();
  }
  return true;
}

export function getForumRestrictionMessage(
  profile: ForumRestrictionProfile | null | undefined
): string | null {
  if (!profile || isForumPostingAllowed(profile)) return null;

  if (profile.forum_banned) {
    const reason = profile.forum_moderation_reason
      ? ` Reason: ${profile.forum_moderation_reason}`
      : "";
    return `Your forum access has been permanently banned.${reason}`;
  }

  if (profile.forum_suspended_until) {
    const until = new Date(profile.forum_suspended_until);
    const reason = profile.forum_moderation_reason
      ? ` Reason: ${profile.forum_moderation_reason}`
      : "";
    return `You are suspended from posting until ${until.toLocaleString()}.${reason}`;
  }

  return "You cannot post in the forum at this time.";
}

export function isForumRestricted(
  profile: ForumRestrictionProfile | null | undefined
): boolean {
  if (!profile) return false;
  if (profile.forum_banned) return true;
  if (profile.forum_suspended_until) {
    return new Date(profile.forum_suspended_until) > new Date();
  }
  return false;
}

export function canEditThread(
  role: UserRole | undefined | null,
  ownerId: string,
  userId: string | undefined
): boolean {
  if (!userId) return false;
  if (ownerId === userId) return true;
  return canModerate(role);
}

export function canDeleteThread(
  role: UserRole | undefined | null,
  ownerId: string,
  userId: string | undefined
): boolean {
  if (!userId) return false;
  if (role === "admin") return true;
  if (ownerId === userId) return true;
  return false;
}

export function canDeleteCommunityPost(
  role: UserRole | undefined | null,
  ownerId: string,
  userId: string | undefined
): boolean {
  if (!userId) return false;
  if (role === "admin") return true;
  return ownerId === userId;
}

export function canEditCommunityPost(
  ownerId: string,
  userId: string | undefined
): boolean {
  if (!userId) return false;
  return ownerId === userId;
}

export function canSoftDeletePost(role: UserRole | undefined | null): boolean {
  return canModerate(role);
}

export function canPinOrLock(role: UserRole | undefined | null): boolean {
  return canModerate(role);
}

export function canManageCategories(role: UserRole | undefined | null): boolean {
  return role === "admin";
}

export function canAssignRoles(role: UserRole | undefined | null): boolean {
  return role === "admin";
}

export function canViewModerationQueue(role: UserRole | undefined | null): boolean {
  return canModerate(role);
}

export const REPORT_REASON_LABELS: Record<ForumReportReason, string> = {
  spam: "Spam or advertising",
  harassment: "Harassment or bullying",
  off_topic: "Off topic",
  inappropriate: "Inappropriate content",
  other: "Other",
};

export const REPORT_STATUS_LABELS: Record<ForumReportStatus, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  dismissed: "Dismissed",
  action_taken: "Action taken",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  user: "Detectorist",
  mod: "Moderator",
  admin: "Administrator",
};
