"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, StatusBadge, Textarea } from "@evermora/ui";
import type { AdminReport } from "@/lib/data/admin";
import { REPORT_REASON_LABEL } from "@/lib/labels";
import { resolveReportAction } from "@/lib/actions/moderation";

export function ReportRow({ report: r }: { report: AdminReport }) {
  const router = useRouter();
  const [note, setNote] = useState(r.resolutionNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function act(status: "reviewing" | "actioned" | "dismissed") {
    setError(null);
    start(async () => {
      const res = await resolveReportAction({
        reportId: r.id,
        status,
        note: note.trim() || undefined,
      });
      if (res.ok) router.refresh();
      else setError(res.error.message);
    });
  }

  const resolved = r.status === "actioned" || r.status === "dismissed";
  const target = r.memorialName ?? (r.tributeId ? "A tribute" : "—");

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-5 text-sm shadow-e1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-fg">{REPORT_REASON_LABEL[r.reason] ?? r.reason}</span>
        <span className="text-[12.5px] text-fg-muted">
          {target} · {new Date(r.createdAt).toLocaleDateString()}
        </span>
        <span className="ml-auto">
          <StatusBadge status={r.status} />
        </span>
      </div>
      {r.details ? <p className="text-fg-muted">{r.details}</p> : null}

      {!resolved ? (
        <>
          <Textarea
            rows={2}
            placeholder="Resolution note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error ? <p className="text-[12.5px] text-bad">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            {r.status === "open" ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => act("reviewing")}
                disabled={pending}
              >
                Start review
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => act("actioned")}
              disabled={pending}
            >
              Actioned
            </Button>
            <Button size="sm" variant="ghost" onClick={() => act("dismissed")} disabled={pending}>
              Dismiss
            </Button>
          </div>
        </>
      ) : r.resolutionNote ? (
        <p className="text-[12.5px] text-fg-subtle">Note: {r.resolutionNote}</p>
      ) : null}
    </li>
  );
}
