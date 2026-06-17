"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { removeGroupBannerStorage } from "@/lib/groups/uploadGroupBanner";
import type { Group } from "./types";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

type GroupDeleteGroupProps = {
  group: Group;
};

export function GroupDeleteGroup({ group }: GroupDeleteGroupProps) {
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const canDelete = confirmName.trim() === group.name;

  async function handleDelete() {
    if (!canDelete || deleting) return;

    if (
      !window.confirm(
        `Permanently delete "${group.name}"? All members, posts, and media will be removed. This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    if (group.banner_url) {
      await removeGroupBannerStorage(supabase, group.banner_url);
    }

    const { error: deleteError } = await supabase.from("groups").delete().eq("id", group.id);

    if (deleteError) {
      setError(deleteError.message || "Could not delete group.");
      setDeleting(false);
      return;
    }

    router.push("/groups");
    router.refresh();
  }

  return (
    <section className="p-4 sm:p-5">
      <h3 className="font-semibold text-sm flex items-center gap-2 text-red-300 mb-2">
        <AlertTriangle className="w-4 h-4" />
        Delete group
      </h3>
      <p className="text-sm text-slate-400 mb-4 leading-relaxed">
        Permanently remove this group, its members, and all posts. Type the group name below to
        confirm.
      </p>
      <div className="space-y-3 max-w-md">
        <input
          value={confirmName}
          onChange={(event) => setConfirmName(event.target.value)}
          placeholder={group.name}
          className="input-field"
          aria-label="Type group name to confirm deletion"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={!canDelete || deleting}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-medium text-red-200 border border-red-900/50 bg-red-950/30 hover:bg-red-950/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Delete group forever
            </>
          )}
        </button>
      </div>
    </section>
  );
}
