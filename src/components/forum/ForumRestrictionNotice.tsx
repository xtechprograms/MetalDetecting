import { Ban } from "lucide-react";

export function ForumRestrictionNotice({ message }: { message: string }) {
  return (
    <div className="glass-card p-6 text-center border border-red-800/40 bg-red-950/20">
      <Ban className="w-8 h-8 text-red-400 mx-auto mb-3" />
      <p className="text-red-300 text-sm">{message}</p>
    </div>
  );
}
