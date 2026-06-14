import type { UserRole } from "@/types/database";
import { Star } from "lucide-react";
import { ROLE_LABELS } from "@/lib/forum/permissions";
import { cn } from "@/lib/utils";

export function RoleBadge({
  role,
  size = "sm",
  showLabel = false,
}: {
  role: UserRole;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  if (role === "user") return null;

  const isAdmin = role === "admin";
  const iconSize = size === "md" ? "w-5 h-5" : "w-4 h-4";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 shrink-0",
        showLabel && "px-2 py-0.5 rounded-full text-xs font-medium",
        isAdmin && showLabel && "bg-gold-500/20 text-gold-300 border border-gold-500/30",
        !isAdmin && showLabel && "bg-slate-400/20 text-slate-300 border border-slate-400/30"
      )}
      title={ROLE_LABELS[role]}
    >
      <Star
        className={cn(
          iconSize,
          isAdmin ? "text-gold-400 fill-gold-400" : "text-slate-300 fill-slate-400"
        )}
      />
      {showLabel && ROLE_LABELS[role]}
    </span>
  );
}
