import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditProfileForm } from "@/components/profile/EditProfileForm";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function EditProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile || profile.id !== user.id) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="section-heading mb-2">Edit Profile</h1>
        <p className="text-slate-400">
          Update your bio, detector info, and profile photo.
        </p>
      </div>
      <div className="glass-card p-8">
        <EditProfileForm profile={profile} />
      </div>
    </div>
  );
}
