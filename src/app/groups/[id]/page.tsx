import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupPageClient } from "@/components/groups/GroupPageClient";
import type { Group } from "@/components/groups/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: group } = await supabase.from("groups").select("name").eq("id", id).maybeSingle();
  return { title: group?.name || "Group" };
}

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirect=/groups/${id}`);

  const { data: membership } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.status !== "active") {
    redirect("/groups");
  }

  const { data: group } = await supabase.from("groups").select("*").eq("id", id).maybeSingle();
  if (!group) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const isOwner = membership.role === "owner";
  const isGroupAdmin = isOwner || membership.role === "admin";

  return (
    <GroupPageClient
      initialGroup={group as Group}
      userId={user.id}
      userRole={profile.role || "user"}
      isOwner={isOwner}
      isGroupAdmin={isGroupAdmin}
      profile={profile}
    />
  );
}
