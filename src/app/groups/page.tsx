import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DiscoverSearch } from "@/components/groups/DiscoverSearch";
import { CreateGroupForm } from "@/components/groups/CreateGroupForm";
import { GroupInvites } from "@/components/groups/GroupInvites";
import { MyGroupsList } from "@/components/groups/MyGroupsList";
import { UsersRound } from "lucide-react";

export const metadata = {
  title: "Groups",
};

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/groups");

  return (
    <div className="w-full min-w-0 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12 overflow-x-hidden">
      <div className="mb-6 sm:mb-8">
        <h1 className="section-heading mb-2 flex items-center gap-2 sm:gap-3">
          <UsersRound className="w-7 h-7 sm:w-8 sm:h-8 text-gold-500 shrink-0" />
          <span className="min-w-0">Groups</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Create private groups, invite members, and share posts only your group can see.
        </p>
      </div>

      <DiscoverSearch currentUserId={user.id} />

      <GroupInvites userId={user.id} />

      <CreateGroupForm userId={user.id} />

      <MyGroupsList userId={user.id} />
    </div>
  );
}
