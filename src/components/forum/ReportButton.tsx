"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ForumReportReason } from "@/types/database";
import { REPORT_REASON_LABELS } from "@/lib/forum/permissions";
import { Flag, Loader2, X } from "lucide-react";

const REASONS: ForumReportReason[] = [
  "spam",
  "harassment",
  "off_topic",
  "inappropriate",
  "other",
];

type Props = {
  threadId: string;
  postId?: string;
  reportType: "thread" | "post";
  contentOwnerId: string;
  currentUserId: string;
};

export function ReportButton({
  threadId,
  postId,
  reportType,
  contentOwnerId,
  currentUserId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ForumReportReason>("spam");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  if (contentOwnerId === currentUserId) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const payload = {
      reporter_id: currentUserId,
      thread_id: threadId,
      post_id: reportType === "post" ? postId : null,
      report_type: reportType,
      reason,
      details: details.trim() || null,
    };

    const { error } = await supabase.from("forum_reports").insert(payload);

    if (error) {
      if (error.code === "23505") {
        setMessage("You already reported this content. Our moderators will review it.");
      } else {
        setMessage(error.message);
      }
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSubmitted(false);
          setMessage(null);
        }}
        className="btn-ghost text-sm text-slate-500 hover:text-amber-400 py-2 min-h-[44px] shrink-0"
        title="Report this content"
      >
        <Flag className="w-4 h-4" />
        <span className="hidden sm:inline">Report</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/60"
            onClick={() => !loading && setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[201] w-auto sm:w-full sm:max-w-md glass-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-slate-100">
                Report {reportType === "thread" ? "Thread" : "Post"}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost p-2 min-h-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-4">
                <p className="text-green-400 font-medium mb-2">Report submitted</p>
                <p className="text-sm text-slate-400">
                  Moderators and admins have been notified and will review this content.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-primary mt-6 w-full"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-slate-400">
                  Tell us what is wrong. Reports are sent to site moderators.
                </p>
                <div>
                  <label className="label-text" htmlFor={`reason-${postId || threadId}`}>
                    Reason
                  </label>
                  <select
                    id={`reason-${postId || threadId}`}
                    className="input-field"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ForumReportReason)}
                  >
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {REPORT_REASON_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-text" htmlFor={`details-${postId || threadId}`}>
                    Additional details (optional)
                  </label>
                  <textarea
                    id={`details-${postId || threadId}`}
                    className="input-field min-h-[80px] resize-y"
                    placeholder="What happened?"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={500}
                  />
                </div>
                {message && (
                  <p className="text-sm text-amber-300">{message}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="btn-secondary flex-1"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Submit Report"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
