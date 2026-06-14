import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateThreadForm } from "@/components/forum/CreateThreadForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "New Thread" };

type Props = { searchParams: Promise<{ category?: string }> };

export default async function NewThreadPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirect=/forum/new${category ? `?category=${category}` : ""}`);

  const { data: categories } = await supabase
    .from("forum_categories")
    .select("*")
    .order("sort_order");

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/forum" className="btn-ghost text-sm mb-6 inline-flex">
        <ArrowLeft className="w-4 h-4" />
        Back to Forum
      </Link>
      <h1 className="section-heading mb-2">Start a Discussion</h1>
      <p className="text-slate-400 mb-8">Share with the global detectorist community.</p>
      <CreateThreadForm categories={categories || []} defaultCategorySlug={category} />
    </div>
  );
}
