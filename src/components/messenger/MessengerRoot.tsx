import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { MessengerWidget } from "./MessengerWidget";

export async function MessengerRoot() {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    return <MessengerWidget userId={user.id} />;
  } catch {
    return null;
  }
}
