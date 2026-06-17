"use client";

import { useState } from "react";
import Link from "next/link";
import type { Group } from "@/components/groups/types";
import type { Profile, UserRole } from "@/types/database";
import { GroupAdminPanel } from "@/components/groups/GroupAdminPanel";
import { GroupFeed } from "@/components/groups/GroupFeed";
import { GroupHeader } from "@/components/groups/GroupHeader";
import { GroupJoinRequests } from "@/components/groups/GroupJoinRequests";
import { GroupMemberManager } from "@/components/groups/GroupMemberManager";
import { ArrowLeft } from "lucide-react";

type GroupPageClientProps = {
  initialGroup: Group;
  userId: string;
  userRole: UserRole;
  isOwner: boolean;
  isGroupAdmin: boolean;
  profile: Pick<Profile, "username" | "display_name" | "avatar_url">;
};

export function GroupPageClient({
  initialGroup,
  userId,
  userRole,
  isOwner,
  isGroupAdmin,
  profile,
}: GroupPageClientProps) {
  const [group, setGroup] = useState(initialGroup);

  return (
    <div className="w-full min-w-0 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
      <Link
        href="/groups"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-gold-400 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to groups
      </Link>

      <GroupHeader group={group} />

      <GroupJoinRequests groupId={group.id} isGroupAdmin={isGroupAdmin} />

      <GroupAdminPanel
        group={group}
        userId={userId}
        isOwner={isOwner}
        isGroupAdmin={isGroupAdmin}
        onGroupUpdated={setGroup}
      />

      <GroupMemberManager
        groupId={group.id}
        userId={userId}
        isOwner={isOwner}
        isGroupAdmin={isGroupAdmin}
      />

      <GroupFeed
        groupId={group.id}
        userId={userId}
        userRole={userRole}
        isGroupAdmin={isGroupAdmin}
        profile={profile}
      />
    </div>
  );
}
