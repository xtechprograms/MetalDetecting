import type { UserContributionStats } from "@/types/database";
import { Compass, MessageSquare, MessagesSquare, Trophy } from "lucide-react";

export function UserStatsBar({
  stats,
  compact = false,
}: {
  stats: UserContributionStats;
  compact?: boolean;
}) {
  const items = [
    { icon: Compass, label: "Finds", value: stats.find_count, color: "text-gold-400" },
    { icon: MessagesSquare, label: "Threads", value: stats.forum_thread_count, color: "text-blue-400" },
    { icon: MessageSquare, label: "Posts", value: stats.forum_post_count, color: "text-green-400" },
    {
      icon: Trophy,
      label: "Contributions",
      value: stats.find_count + stats.forum_thread_count + stats.forum_post_count,
      color: "text-purple-400",
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {items.slice(0, 3).map(({ icon: Icon, label, value, color }) => (
          <span key={label} className="inline-flex items-center gap-1">
            <Icon className={`w-3.5 h-3.5 ${color}`} />
            {value} {label.toLowerCase()}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="glass-card p-4 text-center">
          <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
          <p className="font-display text-2xl font-bold text-slate-100">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}
