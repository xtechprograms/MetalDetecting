import type { UserRole } from "@/types/database";

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

export const ROLE_LABELS: Record<UserRole, string> = {
  user: "Detectorist",
  mod: "Moderator",
  admin: "Administrator",
};
