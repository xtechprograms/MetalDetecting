import type { ForumReportReason, ForumReportStatus, UserRole } from "@/types/database";

export function canModerate(role: UserRole | undefined | null): boolean {
  return role === "mod" || role === "admin";
}

export function isAdmin(role: UserRole | undefined | null): boolean {
  return role === "admin";
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
