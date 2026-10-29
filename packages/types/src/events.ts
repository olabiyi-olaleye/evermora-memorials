/**
 * Canonical names for Evermora domain events, notification events, and audit
 * events. `@evermora/domain` emits these; other layers subscribe by name.
 */

export const DOMAIN_EVENTS = [
  "memorial.created",
  "memorial.published",
  "memorial.archived",
  "memorial.slug_changed",
  "memorial.ownership_transferred",
  "tribute.submitted",
  "tribute.edited",
  "tribute.approved",
  "tribute.rejected",
  "tribute.hidden",
  "funeral_event.created",
  "funeral_event.published",
  "funeral_event.cancelled",
  "family_update.published",
  "memorial_admin.invited",
  "memorial_role.changed",
  "service_request.created",
  "memorial.reported",
  "share_asset.generated",
] as const;

export type DomainEventName = (typeof DOMAIN_EVENTS)[number];

export const AUDIT_ACTIONS = DOMAIN_EVENTS;
export type AuditActionName = DomainEventName;
