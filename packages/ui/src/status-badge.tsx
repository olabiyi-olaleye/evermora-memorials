import { Badge, type BadgeProps } from "./badge";

type Tone = NonNullable<BadgeProps["tone"]>;

/**
 * StatusBadge — maps the real Evermora enum values to one consistent tone +
 * label everywhere they appear (memorial_status, memorial_visibility,
 * tribute_status, report_status, service_request_status). Colour is never the
 * only cue — the dot and the word carry it too.
 */
const MAP: Record<string, { tone: Tone; label: string }> = {
  // memorial lifecycle
  draft: { tone: "neutral", label: "Draft" },
  published: { tone: "ok", label: "Published" },
  archived: { tone: "neutral", label: "Archived" },
  suspended: { tone: "bad", label: "Suspended" },
  // memorial visibility
  private: { tone: "info", label: "Private" },
  anyone_with_link: { tone: "accent", label: "Anyone with link" },
  public: { tone: "brand", label: "Public" },
  // tributes
  pending: { tone: "warn", label: "Awaiting review" },
  approved: { tone: "ok", label: "Approved" },
  rejected: { tone: "bad", label: "Rejected" },
  hidden: { tone: "neutral", label: "Hidden" },
  // reports
  open: { tone: "warn", label: "Open" },
  reviewing: { tone: "info", label: "Reviewing" },
  actioned: { tone: "ok", label: "Actioned" },
  dismissed: { tone: "neutral", label: "Dismissed" },
  // service requests
  new: { tone: "warn", label: "New" },
  in_review: { tone: "info", label: "In review" },
  scheduled: { tone: "brand", label: "Scheduled" },
  completed: { tone: "ok", label: "Completed" },
  cancelled: { tone: "neutral", label: "Cancelled" },
};

export interface StatusBadgeProps {
  status: string;
  /** Override the label; the tone still comes from `status`. */
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const entry = MAP[status] ?? { tone: "neutral" as Tone, label: status };
  return (
    <Badge tone={entry.tone} withDot className={className}>
      {label ?? entry.label}
    </Badge>
  );
}
