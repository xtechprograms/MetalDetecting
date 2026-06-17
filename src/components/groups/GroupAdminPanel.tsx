"use client";

import { useState } from "react";
import type { Group } from "./types";
import { GroupSettingsForm } from "./GroupSettingsForm";
import { InviteMemberForm } from "./InviteMemberForm";
import { ChevronDown, ChevronUp, Shield } from "lucide-react";

type GroupAdminPanelProps = {
  group: Group;
  userId: string;
  isOwner: boolean;
  isGroupAdmin: boolean;
  onGroupUpdated: (group: Group) => void;
};

export function GroupAdminPanel({
  group,
  userId,
  isOwner,
  isGroupAdmin,
  onGroupUpdated,
}: GroupAdminPanelProps) {
  const [open, setOpen] = useState(false);

  if (!isGroupAdmin) return null;

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full glass-card p-4 flex items-center justify-between gap-3 text-left min-h-[44px]"
      >
        <span className="font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-gold-400" />
          {isOwner ? "Owner controls" : "Admin controls"}
        </span>
        {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {open && (
        <div className="mt-4 space-y-0">
          <GroupSettingsForm group={group} isOwner={isOwner} onUpdated={onGroupUpdated} />
          <InviteMemberForm groupId={group.id} userId={userId} />
        </div>
      )}
    </div>
  );
}
