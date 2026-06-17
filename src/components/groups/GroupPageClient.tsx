"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Group } from "@/components/groups/types";
import type { Profile, UserRole } from "@/types/database";
import { GroupAdminPanel } from "@/components/groups/GroupAdminPanel";
import { GroupFeed } from "@/components/groups/GroupFeed";
import { GroupHeader } from "@/components/groups/GroupHeader";
import { GroupMemberManager } from "@/components/groups/GroupMemberManager";
import { ArrowLeft, MessageSquare, Settings, Users } from "lucide-react";

type GroupTab = "posts" | "members" | "manage";

type GroupPageClientProps = {
  initialGroup: Group;
  userId: string;
  userRole: UserRole;
  isOwner: boolean;
  isGroupAdmin: boolean;
  profile: Pick<Profile, "username" | "display_name" | "avatar_url">;
};

const tabClass = (active: boolean) =>
  [
    "flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
    active
      ? "bg-gold-500/15 text-gold-300 border border-gold-500/30"
      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent",
  ].join(" ");

export function GroupPageClient({
  initialGroup,
  userId,
  userRole,
  isOwner,
  isGroupAdmin,
  profile,
}: GroupPageClientProps) {
  const [group, setGroup] = useState(initialGroup);
  const [tab, setTab] = useState<GroupTab>("posts");

  useEffect(() => {
    if (window.location.hash === "#join-requests" && isGroupAdmin) {
      setTab("manage");
    }
  }, [isGroupAdmin]);

  const tabs: { id: GroupTab; label: string; icon: typeof MessageSquare; adminOnly?: boolean }[] =
    [
      { id: "posts", label: "Posts", icon: MessageSquare },
      { id: "members", label: "Members", icon: Users },
      { id: "manage", label: "Manage", icon: Settings, adminOnly: true },
    ];

  const visibleTabs = tabs.filter((item) => !item.adminOnly || isGroupAdmin);

  return (
    <div className="w-full min-w-0 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
      <Link
        href="/groups"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-gold-400 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to groups
      </Link>

      <GroupHeader group={group} />

      <nav
        className="flex gap-1 p-1 mb-6 rounded-xl bg-slate-900/70 border border-slate-800/80 overflow-x-auto"
        aria-label="Group sections"
      >
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={tabClass(tab === id)}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {tab === "posts" && (
        <section aria-label="Group posts">
          <GroupFeed
            groupId={group.id}
            userId={userId}
            userRole={userRole}
            isGroupAdmin={isGroupAdmin}
            profile={profile}
          />
        </section>
      )}

      {tab === "members" && (
        <section aria-label="Group members">
          <GroupMemberManager
            groupId={group.id}
            userId={userId}
            isOwner={isOwner}
            isGroupAdmin={isGroupAdmin}
            embedded
          />
        </section>
      )}

      {tab === "manage" && isGroupAdmin && (
        <section aria-label="Group management">
          <GroupAdminPanel
            group={group}
            userId={userId}
            isOwner={isOwner}
            isGroupAdmin={isGroupAdmin}
            onGroupUpdated={setGroup}
          />
        </section>
      )}
    </div>
  );
}
