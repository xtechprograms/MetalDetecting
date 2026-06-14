"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ForumReport, ForumReportStatus, UserRole } from "@/types/database";
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
} from "@/lib/forum/permissions";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";

type Props = {
  reports: ForumReport[];
  currentUserId: string;
  currentRole: UserRole;
  showRevokeMod?: boolean;
  moderators?: Array<{
    id: string;
    username: string;
    display_name: string;
  }>;
};

export function ModerationQueue({
  reports,
  currentUserId,
  currentRole,
  showRevokeMod = false,
  moderators = [],
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const router = useRouter();
  const supabase = createClient();

  const visibleReports =
    filter === "pending"
      ? reports.filter((r) => r.status === "pending")
      : reports;

  async function updateReportStatus(
    reportId: string,
    status: ForumReportStatus,
    notes?: string
  ) {
    setLoading(reportId);
    setMessage(null);

    const { error } = await supabase
      .from("forum_reports")
      .update({
        status,
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
        moderator_notes: notes || null,
      })
      .eq("id", reportId);

    if (error) setMessage(error.message);
    else setMessage("Report updated");
    setLoading(null);
    router.refresh();
  }

  async function revokeModerator(userId: string, displayName: string) {
    if (
      !confirm(
        `Revoke moderator permissions from ${displayName}? They will lose pin, lock, and delete powers immediately.`
      )
    ) {
      return;
    }

    setRevoking(userId);
    setMessage(null);

    const { error } = await supabase.rpc("admin_revoke_moderator", {
      target_user_id: userId,
    });

    if (error) setMessage(error.message);
    else setMessage(`${displayName} is no longer a moderator`);
    setRevoking(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="glass-card p-4 text-sm text-gold-300 border border-gold-500/30">
          {message}
        </div>
      )}

      {showRevokeMod && moderators.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Active Moderators
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Revoke mod permissions if someone abuses their role. They become a regular user
            immediately.
          </p>
          <div className="space-y-3">
            {moderators.map((mod) => (
              <div
                key={mod.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-800/30"
              >
                <div>
                  <Link
                    href={`/profile/${mod.username}`}
                    className="font-semibold hover:text-gold-400"
                  >
                    {mod.display_name}
                  </Link>
                  <p className="text-xs text-slate-500">@{mod.username}</p>
                </div>
                <button
                  type="button"
                  onClick={() => revokeModerator(mod.id, mod.display_name)}
                  disabled={revoking === mod.id}
                  className="btn-secondary text-sm text-red-400 border-red-800/50 w-full sm:w-auto min-h-[44px]"
                >
                  {revoking === mod.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Revoke Mod Permissions"
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-lg font-semibold">Reported Content</h2>
            <p className="text-sm text-slate-400">
              User reports appear here for {currentRole === "admin" ? "admins and mods" : "review"}.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`btn-secondary text-sm py-2 ${
                filter === "pending" ? "border-gold-500/50 text-gold-400" : ""
              }`}
            >
              Pending ({reports.filter((r) => r.status === "pending").length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`btn-secondary text-sm py-2 ${
                filter === "all" ? "border-gold-500/50 text-gold-400" : ""
              }`}
            >
              All
            </button>
          </div>
        </div>

        {visibleReports.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <AlertTriangle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            No {filter === "pending" ? "pending " : ""}reports
          </div>
        ) : (
          <div className="space-y-4">
            {visibleReports.map((report) => {
              const contentPreview =
                report.report_type === "post"
                  ? report.forum_posts?.content
                  : report.forum_threads?.title;
              const author =
                report.report_type === "post"
                  ? report.forum_posts?.profiles?.display_name
                  : report.forum_threads?.profiles?.display_name;

              return (
                <div
                  key={report.id}
                  className="p-4 sm:p-5 rounded-xl bg-slate-800/30 border border-slate-700/50"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        report.status === "pending"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {REPORT_STATUS_LABELS[report.status]}
                    </span>
                    <span className="text-xs text-slate-500">
                      {report.report_type === "thread" ? "Thread" : "Reply"} ·{" "}
                      {REPORT_REASON_LABELS[report.reason]}
                    </span>
                    <span className="text-xs text-slate-600">
                      {formatDate(report.created_at)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 font-medium mb-1 line-clamp-2">
                    {contentPreview}
                  </p>
                  {author && (
                    <p className="text-xs text-slate-500 mb-2">By {author}</p>
                  )}
                  {report.details && (
                    <p className="text-sm text-slate-400 mb-3 italic">
                      &ldquo;{report.details}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mb-4">
                    Reported by {report.reporter?.display_name || "Unknown"}
                  </p>

                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <Link
                      href={`/forum/thread/${report.thread_id}`}
                      className="btn-secondary text-sm py-2 inline-flex"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Thread
                    </Link>
                    {report.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateReportStatus(report.id, "dismissed")}
                          disabled={loading === report.id}
                          className="btn-secondary text-sm py-2"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => updateReportStatus(report.id, "reviewed")}
                          disabled={loading === report.id}
                          className="btn-secondary text-sm py-2"
                        >
                          Mark Reviewed
                        </button>
                        <button
                          type="button"
                          onClick={() => updateReportStatus(report.id, "action_taken")}
                          disabled={loading === report.id}
                          className="btn-primary text-sm py-2"
                        >
                          Action Taken
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
