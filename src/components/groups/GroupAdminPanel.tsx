"use client";

import type { Group } from "./types";
import { GroupDeleteGroup } from "./GroupDeleteGroup";
import { GroupJoinRequests } from "./GroupJoinRequests";
import { GroupSettingsForm } from "./GroupSettingsForm";
import { InviteMemberForm } from "./InviteMemberForm";
import { Shield } from "lucide-react";

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
  if (!isGroupAdmin) return null;

  return (
    <div className="glass-card overflow-hidden divide-y divide-slate-800/80">
      <div className="px-4 sm:px-5 py-4 bg-slate-900/40">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-gold-400" />
          {isOwner ? "Owner controls" : "Admin controls"}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Manage settings, invitations, and join requests for this group.
        </p>
      </div>

      <GroupJoinRequests groupId={group.id} isGroupAdmin={isGroupAdmin} embedded />

      <GroupSettingsForm
        group={group}
        isOwner={isOwner}
        onUpdated={onGroupUpdated}
        embedded
      />

      <InviteMemberForm groupId={group.id} userId={userId} embedded />

      {isOwner && <GroupDeleteGroup group={group} />}
    </div>
  );
}
