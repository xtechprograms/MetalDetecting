"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Trash2 } from "lucide-react";

type DeleteFindButtonProps = {
  findId: string;
  findTitle: string;
  photoUrl?: string | null;
  className?: string;
};

export function DeleteFindButton({
  findId,
  findTitle,
  photoUrl,
  className = "",
}: DeleteFindButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Delete "${findTitle}"? This cannot be undone and will remove it from your log and the global map.`
      )
    ) {
      return;
    }

    setLoading(true);

    if (photoUrl) {
      const pathMatch = photoUrl.match(/find-photos\/(.+)$/);
      if (pathMatch?.[1]) {
        await supabase.storage
          .from("find-photos")
          .remove([decodeURIComponent(pathMatch[1])]);
      }
    }

    const { error } = await supabase.from("finds").delete().eq("id", findId);

    setLoading(false);

    if (error) {
      alert("Failed to delete find: " + error.message);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className={`inline-flex items-center gap-1 text-sm text-red-400 hover:bg-red-900/20 px-2 py-1 rounded-lg min-h-[44px] disabled:opacity-50 ${className}`}
      aria-label={`Delete ${findTitle}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
      Delete
    </button>
  );
}
