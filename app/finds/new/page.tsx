import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogFindForm } from "@/components/finds/LogFindForm";

export const metadata = {
  title: "Log a Find",
};

export default async function NewFindPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/finds/new");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="section-heading mb-2">Log a Find</h1>
        <p className="text-slate-400">
          Document your discovery with photos, GPS coordinates, and details.
        </p>
      </div>
      <LogFindForm />
    </div>
  );
}
