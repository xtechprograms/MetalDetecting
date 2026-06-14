import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlusCircle, Pin, Lock, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { RoleBadge } from "@/components/forum/RoleBadge";
import type { UserRole } from "@/types/database";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("forum_categories")
    .select("name")
    .eq("slug", slug)
    .single();
  return { title: data?.name ? `${data.name} Forum` : "Forum Category" };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: category } = await supabase
    .from("forum_categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!category) notFound();

  const { data: threads } = await supabase
    .from("forum_threads")
    .select("*, profiles(username, display_name, role)")
    .eq("category_id", category.id)
    .eq("is_deleted", false)
    .order("is_pinned", { ascending: false })
    .order("last_reply_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link href="/forum" className="btn-ghost text-sm mb-6 inline-flex">
        <ArrowLeft className="w-4 h-4" />
        Back to Forum
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="section-heading flex items-center gap-3 mb-2">
            <span>{category.icon}</span>
            {category.name}
          </h1>
          <p className="text-slate-400">{category.description}</p>
        </div>
        {user && (
          <Link href={`/forum/new?category=${slug}`} className="btn-primary text-sm">
            <PlusCircle className="w-4 h-4" />
            New Thread
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {threads && threads.length > 0 ? (
          threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/forum/thread/${thread.id}`}
              className="glass-card p-5 block hover:border-gold-500/20 transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                {thread.is_pinned && <Pin className="w-3.5 h-3.5 text-gold-400" />}
                {thread.is_locked && <Lock className="w-3.5 h-3.5 text-slate-500" />}
                <h3 className="font-semibold text-slate-100 break-words">{thread.title}</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <span>{thread.profiles?.display_name}</span>
                <RoleBadge role={(thread.profiles?.role as UserRole) || "user"} />
                <span>· {thread.reply_count} replies · {formatDate(thread.created_at)}</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="glass-card p-12 text-center text-slate-400">
            No threads in this category yet.
          </div>
        )}
      </div>
    </div>
  );
}
