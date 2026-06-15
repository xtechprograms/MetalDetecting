import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { Bell } from "lucide-react";

export const metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/notifications");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="section-heading mb-2 flex items-center gap-3">
          <Bell className="w-8 h-8 text-gold-500" />
          Notifications
        </h1>
        <p className="text-slate-400">
          Friend requests, forum activity, finds from friends, replies, and reactions.
        </p>
      </div>

      <NotificationsList userId={user.id} />
    </div>
  );
}
