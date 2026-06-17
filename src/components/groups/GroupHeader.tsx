import type { Group } from "./types";
import { Globe, Lock, UsersRound } from "lucide-react";

export function GroupHeader({ group }: { group: Group }) {
  const isOpen = group.join_policy === "open";

  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/40 shadow-lg shadow-black/20">
      <div className="relative aspect-[5/2] sm:aspect-[3/1] min-h-[140px] bg-slate-800">
        {group.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={group.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gold-900/30 via-slate-900 to-slate-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/10" />

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 border border-slate-700/60 px-2.5 py-1 text-xs text-slate-300">
              <UsersRound className="w-3.5 h-3.5 text-gold-400" />
              {group.member_count} {group.member_count === 1 ? "member" : "members"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 border border-slate-700/60 px-2.5 py-1 text-xs text-slate-300">
              {isOpen ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  Public group
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-gold-400" />
                  Private group
                </>
              )}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-950/70 border border-slate-700/60 px-2.5 py-1 text-xs text-slate-400">
              Members only
            </span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-sm leading-tight break-words [overflow-wrap:anywhere]">
            {group.name}
          </h1>
        </div>
      </div>

      {group.description && (
        <div className="px-4 sm:px-6 py-4 border-t border-slate-800/70 bg-slate-900/30">
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{group.description}</p>
        </div>
      )}
    </header>
  );
}
