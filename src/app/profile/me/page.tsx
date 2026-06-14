import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "My Profile",
};

export default async function MyProfileRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/profile/me");

  let { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.username) {
    const meta = user.user_metadata ?? {};
    const fallbackUsername =
      typeof meta.username === "string" && meta.username.length >= 3
        ? meta.username.toLowerCase()
        : `detectorist_${user.id.replace(/-/g, "").slice(0, 8)}`;
    const displayName =
      typeof meta.display_name === "string" && meta.display_name.trim()
        ? meta.display_name
        : fallbackUsername;

    const { data: created } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          username: fallbackUsername,
          display_name: displayName,
        },
        { onConflict: "id" }
      )
      .select("username")
      .maybeSingle();

    profile = created;
  }

  if (!profile?.username) notFound();

  redirect(`/profile/${profile.username}`);
}
