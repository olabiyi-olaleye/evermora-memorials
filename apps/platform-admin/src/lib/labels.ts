import type { ReportReason, ServiceRequestStatus, ServiceRequestType } from "@evermora/types";

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  spam: "Spam",
  abuse: "Abuse",
  impersonation: "Impersonation",
  privacy: "Privacy concern",
  inaccurate: "Inaccurate information",
  other: "Other",
};

export const SERVICE_TYPE_LABEL: Record<ServiceRequestType, string> = {
  funeral_planning: "Funeral planning",
  printing: "Programme / card printing",
  livestream: "Livestreaming",
  catering: "Catering",
  transport: "Transport",
  flowers: "Flowers",
  other: "Other",
};

/** Staff-facing service-request status labels. */
export const SERVICE_STATUS_LABEL: Record<ServiceRequestStatus, string> = {
  new: "New",
  in_review: "In review",
  contacted: "Contacted",
  scheduled: "Scheduled",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

/** Terminal statuses — changing to one of these confirms first. */
export const TERMINAL_SERVICE_STATUS: ServiceRequestStatus[] = [
  "completed",
  "declined",
  "cancelled",
];
