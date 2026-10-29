/**
 * Core memorial-related enums and identifier brands.
 *
 * Phase 0 scope: vocabulary only. Full entity contracts are added in Phase 2
 * alongside the ERD and migrations.
 */

/**
 * A memorial's visibility to the public web. Mirrors the `memorial_visibility`
 * enum in supabase/migrations. Search-engine indexing is a SEPARATE flag
 * (`privacy_settings.search_indexing_enabled`), not a visibility level.
 */
export const MEMORIAL_VISIBILITY = ["private", "anyone_with_link", "public"] as const;
export type MemorialVisibility = (typeof MEMORIAL_VISIBILITY)[number];

/** Lifecycle state of a memorial. Mirrors the `memorial_status` enum. */
export const MEMORIAL_STATUS = ["draft", "published", "archived", "suspended", "deleted"] as const;
export type MemorialStatus = (typeof MEMORIAL_STATUS)[number];

/**
 * Optional, family-set. Mirrors `memorial_gender`. Unset (`null`) and
 * "prefer not to say" are the same state — both render today's neutral
 * copy; nothing distinguishes "never asked" from "declined to say".
 */
export const MEMORIAL_GENDER = ["male", "female"] as const;
export type MemorialGender = (typeof MEMORIAL_GENDER)[number];

/** Funeral planning progress — independent of `MEMORIAL_STATUS`. */
export const FUNERAL_PLANNING_STATUS = [
  "not_started",
  "planning",
  "partially_confirmed",
  "confirmed",
  "completed",
] as const;
export type FuneralPlanningStatus = (typeof FUNERAL_PLANNING_STATUS)[number];

/** Moderation state of a visitor-submitted tribute. Mirrors `tribute_status`. */
export const TRIBUTE_STATUS = ["pending", "approved", "rejected", "hidden", "reported"] as const;
export type TributeStatus = (typeof TRIBUTE_STATUS)[number];

/** Notification event kinds. Mirrors `notification_event_type`. */
export const NOTIFICATION_EVENT_TYPE = [
  "tribute_submitted",
  "tribute_approved",
  "photo_submitted",
  "admin_invited",
  "funeral_event_published",
  "funeral_event_updated",
  "family_update_published",
  "service_request_received",
  "memorial_reported",
  "anniversary_upcoming",
] as const;
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPE)[number];

/** Notification delivery channels. Mirrors `notification_channel`. */
export const NOTIFICATION_CHANNEL = ["in_app", "email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[number];

/** Lifecycle of an abuse / accuracy report. Mirrors `report_status`. */
export const REPORT_STATUS = ["open", "reviewing", "actioned", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUS)[number];

/** Lifecycle of a service request. Mirrors `service_request_status`. */
export const SERVICE_REQUEST_STATUS = [
  "new",
  "in_review",
  "contacted",
  "scheduled",
  "completed",
  "declined",
  "cancelled",
] as const;
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUS)[number];

/** Kind of Evermora-facilitated service request. Mirrors `service_request_type`. */
export const SERVICE_REQUEST_TYPE = [
  "funeral_planning",
  "printing",
  "livestream",
  "catering",
  "transport",
  "flowers",
  "other",
] as const;
export type ServiceRequestType = (typeof SERVICE_REQUEST_TYPE)[number];

/** Importance of a family update. Mirrors `update_importance`. */
export const UPDATE_IMPORTANCE = ["normal", "high", "urgent"] as const;
export type UpdateImportance = (typeof UPDATE_IMPORTANCE)[number];

/** Reason a memorial or tribute was reported. Mirrors `report_reason`. */
export const REPORT_REASON = [
  "spam",
  "abuse",
  "impersonation",
  "privacy",
  "inaccurate",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASON)[number];

/** Lifecycle state of a funeral event. Mirrors `funeral_event_status`. */
export const FUNERAL_EVENT_STATUS = ["draft", "published", "cancelled", "completed"] as const;
export type FuneralEventStatus = (typeof FUNERAL_EVENT_STATUS)[number];

/** Kinds of funeral / memorial event. Mirrors `funeral_event_type`. */
export const FUNERAL_EVENT_TYPE = [
  "service_of_songs",
  "wake",
  "viewing",
  "funeral_service",
  "burial",
  "reception",
  "thanksgiving",
  "custom",
] as const;
export type FuneralEventType = (typeof FUNERAL_EVENT_TYPE)[number];

/** Most RSVP contacts one event can list. Mirrors `funeral_events_contacts_shape`. */
export const MAX_FUNERAL_EVENT_CONTACTS = 5;

/** One RSVP / enquiry contact on a funeral event (`funeral_events.contacts`). */
export interface FuneralEventContact {
  name: string;
  phone: string | null;
}

/** Generic publish state for editor-authored content. Mirrors `publication_status`. */
export const PUBLICATION_STATUS = ["draft", "published", "archived"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUS)[number];

/** Per-section visibility. `inherit` defers to the memorial-level setting. Mirrors `section_visibility`. */
export const SECTION_VISIBILITY = ["inherit", "private", "members", "public"] as const;
export type SectionVisibility = (typeof SECTION_VISIBILITY)[number];

/** Story-section kinds. Mirrors the `story_section_kind` enum. */
export const STORY_SECTION_KIND = [
  "biography",
  "early_life",
  "family",
  "career",
  "education",
  "faith",
  "achievements",
  "legacy",
  "custom",
] as const;
export type StorySectionKind = (typeof STORY_SECTION_KIND)[number];

/**
 * Branded identifier types. The runtime value is a string (UUID); the brand
 * stops a raw string — or the wrong kind of id — being passed by mistake.
 */
declare const brand: unique symbol;
export type Brand<T, TBrand extends string> = T & { readonly [brand]: TBrand };

export type MemorialId = Brand<string, "MemorialId">;
export type ProfileId = Brand<string, "ProfileId">;
export type TributeId = Brand<string, "TributeId">;
export type FuneralEventId = Brand<string, "FuneralEventId">;
export type ShareResolverId = Brand<string, "ShareResolverId">;
