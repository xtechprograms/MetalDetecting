import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { Rss } from "lucide-react";

export const metadata = {
  title: "Feed",
};

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/feed");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login?redirect=/feed");

  return (
    <div className="w-full min-w-0 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
      <div className="mb-6 sm:mb-8">
        <h1 className="section-heading mb-2 flex items-center gap-2 sm:gap-3">
          <Rss className="w-7 h-7 sm:w-8 sm:h-8 text-gold-500 shrink-0" />
          <span className="min-w-0">Feed</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Share updates, photos, and videos with the detectorist community.
        </p>
      </div>

      <CommunityFeed userId={user.id} profile={profile} />
    </div>
  );
}
