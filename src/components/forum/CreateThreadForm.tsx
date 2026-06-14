"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadForumImages } from "@/lib/forum/uploadForumImages";
import { ForumImageUpload } from "@/components/forum/ForumImageUpload";
import type { ForumCategory } from "@/types/database";
import { Loader2, AlertCircle } from "lucide-react";
import { ForumRestrictionNotice } from "@/components/forum/ForumRestrictionNotice";

export function CreateThreadForm({
  categories,
  defaultCategorySlug,
  restrictionMessage,
}: {
  categories: ForumCategory[];
  defaultCategorySlug?: string;
  restrictionMessage?: string | null;
}) {
  const [categoryId, setCategoryId] = useState(
    categories.find((c) => c.slug === defaultCategorySlug)?.id || categories[0]?.id || ""
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  if (restrictionMessage) {
    return <ForumRestrictionNotice message={restrictionMessage} />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in to post");
      setLoading(false);
      return;
    }

    const { urls, error: uploadError } = await uploadForumImages(supabase, user.id, images);
    if (uploadError) {
      setError(uploadError);
      setLoading(false);
      return;
    }

    if (!content.trim() && urls.length === 0) {
      setError("Add some text or at least one image");
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("forum_threads")
      .insert({
        category_id: categoryId,
        user_id: user.id,
        title: title.trim(),
        content: content.trim() || "(image post)",
        image_urls: urls,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/forum/thread/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label className="label-text">Category</label>
        <select
          className="input-field"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label-text">Title</label>
        <input
          className="input-field"
          placeholder="What's on your mind, detectorist?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={5}
          maxLength={200}
        />
      </div>

      <div>
        <label className="label-text">Content</label>
        <textarea
          className="input-field min-h-[180px] resize-y"
          placeholder="Share your thoughts, questions, or finds..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          minLength={content.trim() || images.length === 0 ? 10 : 0}
        />
      </div>

      <div>
        <label className="label-text">Images (optional)</label>
        <ForumImageUpload files={images} onChange={setImages} disabled={loading} />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Thread"}
      </button>
    </form>
  );
}
