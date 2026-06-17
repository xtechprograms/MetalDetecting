import type { Group } from "./types";
import { Lock, UsersRound } from "lucide-react";

export function GroupHeader({ group }: { group: Group }) {
  return (
    <div className="mb-6 sm:mb-8 overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/40">
      <div className="relative aspect-[3/1] sm:aspect-[21/7] bg-slate-800">
        {group.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={group.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gold-900/20 via-slate-900 to-slate-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
      </div>
      <div className="p-4 sm:p-5 -mt-2 relative">
        <h1 className="section-heading mb-2 flex items-center gap-2 sm:gap-3">
          <UsersRound className="w-7 h-7 sm:w-8 sm:h-8 text-gold-500 shrink-0" />
          <span className="min-w-0">{group.name}</span>
        </h1>
        {group.description && (
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">{group.description}</p>
        )}
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" />
          {group.member_count} members · Members only
          {group.join_policy === "open" ? " · Open to join" : " · Invite only"}
        </p>
      </div>
    </div>
  );
}
