"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, PlusCircle } from "lucide-react";

export function CreateGroupForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinPolicy, setJoinPolicy] = useState<"invite_only" | "open">("invite_only");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || loading) return;

    setLoading(true);
    setError(null);

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: trimmed,
        description: description.trim() || null,
        created_by: userId,
        join_policy: joinPolicy,
      })
      .select("id")
      .single();

    if (groupError || !group) {
      setError(groupError?.message || "Could not create group.");
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: userId,
      role: "owner",
      status: "active",
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    router.push(`/groups/${group.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary w-full sm:w-auto min-h-[44px] mb-6"
      >
        <PlusCircle className="w-4 h-4" />
        Create group
      </button>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="glass-card p-4 sm:p-5 mb-6 space-y-4">
      <h2 className="font-display text-lg font-semibold">Create a group</h2>
      <div>
        <label className="label-text" htmlFor="group-name">
          Group name
        </label>
        <input
          id="group-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="input-field"
          placeholder="e.g. Weekend Hunt Crew"
          maxLength={80}
        />
      </div>
      <div>
        <label className="label-text" htmlFor="group-description">
          Description (optional)
        </label>
        <textarea
          id="group-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="input-field min-h-[88px] resize-y"
          placeholder="What is this group about?"
        />
      </div>
      <div>
        <label className="label-text" htmlFor="group-policy">
          Group visibility
        </label>
        <select
          id="group-policy"
          value={joinPolicy}
          onChange={(event) => setJoinPolicy(event.target.value as "invite_only" | "open")}
          className="input-field"
        >
          <option value="invite_only">Private — request or invite to join</option>
          <option value="open">Public — anyone can find and join from search</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={loading} className="btn-primary min-h-[44px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create group"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary min-h-[44px]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
