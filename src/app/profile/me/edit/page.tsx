import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit Profile" };

export default async function MyEditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/profile/me/edit");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.username) notFound();

  redirect(`/profile/${profile.username}/edit`);
}
