import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommunitySearch } from "@/components/community/CommunitySearch";
import { FriendRequests } from "@/components/community/FriendRequests";
import { Users } from "lucide-react";

export const metadata = {
  title: "Community",
};

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/community");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="section-heading mb-2 flex items-center gap-3">
          <Users className="w-8 h-8 text-gold-500" />
          Detectorist Community
        </h1>
        <p className="text-slate-400">
          Find and connect with fellow metal detectorists worldwide.
        </p>
      </div>

      <FriendRequests userId={user.id} />

      <div className="mt-10">
        <h2 className="font-display text-xl font-semibold mb-4">Find Detectorists</h2>
        <CommunitySearch currentUserId={user.id} />
      </div>
    </div>
  );
}
