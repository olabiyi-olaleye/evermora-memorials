import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  FuneralEventContact,
  MemorialGender,
  MemorialRole,
  MemorialStatus,
  MemorialVisibility,
} from "@evermora/types";
import type { AuditActorKind } from "@evermora/domain";

/**
 * Hand-written, MINIMAL Drizzle table definitions — only the columns the
 * core-memorial operations (`createMemorial`, `publishMemorial`,
 * `changeMemorialSlug`) actually read or write.
 *
 * These are NOT the schema authority — `supabase/migrations/` is. They carry no
 * foreign-key helpers or policies (the database enforces those); keeping them
 * relation-free also sidesteps the drizzle-kit introspection issues with our
 * cyclic media↔memorial FKs (see `src/drizzle/README.md`). Add columns/tables
 * here as later phases need them.
 */

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

export const memorials = pgTable("memorials", {
  id: uuid("id").primaryKey().notNull(),
  status: text("status").$type<MemorialStatus>().notNull(),
  funeralPlanningStatus: text("funeral_planning_status").notNull(),
  createdBy: uuid("created_by"),
  fullName: text("full_name").notNull(),
  preferredName: text("preferred_name"),
  headline: text("headline"),
  survivedBy: text("survived_by"),
  gender: text("gender").$type<MemorialGender>(),
  biographySummary: text("biography_summary"),
  dateOfBirth: text("date_of_birth"),
  birthYearOnly: boolean("birth_year_only").notNull().default(false),
  dateOfDeath: text("date_of_death"),
  birthPlace: text("birth_place"),
  restingPlace: text("resting_place"),
  portraitMediaId: uuid("portrait_media_id"),
  coverMediaId: uuid("cover_media_id"),
  publishedAt: ts("published_at"),
  archivedAt: ts("archived_at"),
  suspendedAt: ts("suspended_at"),
  suspendedReason: text("suspended_reason"),
  deletedAt: ts("deleted_at"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const memorialMemberships = pgTable("memorial_memberships", {
  id: uuid("id").primaryKey().notNull(),
  memorialId: uuid("memorial_id").notNull(),
  profileId: uuid("profile_id"),
  role: text("role").$type<MemorialRole>().notNull(),
  status: text("status").notNull(),
  invitedEmail: text("invited_email"),
  invitedBy: uuid("invited_by"),
  invitedAt: ts("invited_at").notNull(),
  acceptedAt: ts("accepted_at"),
  revokedAt: ts("revoked_at"),
});

export const memorialSlugs = pgTable("memorial_slugs", {
  id: uuid("id").primaryKey().notNull(),
  memorialId: uuid("memorial_id").notNull(),
  slug: text("slug").notNull(),
  isCanonical: boolean("is_canonical").notNull(),
  redirectEnabled: boolean("redirect_enabled").notNull(),
  retiredAt: ts("retired_at"),
  createdAt: ts("created_at").notNull(),
  createdBy: uuid("created_by"),
});

export const reservedSlugs = pgTable("reserved_slugs", {
  slug: text("slug").primaryKey().notNull(),
  category: text("category").notNull(),
});

export const privacySettings = pgTable("privacy_settings", {
  memorialId: uuid("memorial_id").primaryKey().notNull(),
  visibility: text("visibility").$type<MemorialVisibility>().notNull(),
  searchIndexingEnabled: boolean("search_indexing_enabled").notNull(),
});

export const featureSettings = pgTable("feature_settings", {
  memorialId: uuid("memorial_id").primaryKey().notNull(),
  tributesEnabled: boolean("tributes_enabled").notNull(),
  tributeModerationEnabled: boolean("tribute_moderation_enabled").notNull(),
  photoContributionsEnabled: boolean("photo_contributions_enabled").notNull(),
  candlesEnabled: boolean("candles_enabled").notNull(),
  funeralEnabled: boolean("funeral_enabled").notNull(),
  familySectionEnabled: boolean("family_section_enabled").notNull(),
  updatesEnabled: boolean("updates_enabled").notNull(),
  guestbookEnabled: boolean("guestbook_enabled").notNull(),
  sharingEnabled: boolean("sharing_enabled").notNull(),
  qrCodeEnabled: boolean("qr_code_enabled").notNull(),
  visitorAnalyticsEnabled: boolean("visitor_analytics_enabled").notNull(),
});

export const storySections = pgTable("story_sections", {
  id: uuid("id").primaryKey().notNull(),
  memorialId: uuid("memorial_id").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  visibility: text("visibility").notNull(),
  status: text("status").notNull(),
  displayOrder: integer("display_order").notNull(),
  deletedAt: ts("deleted_at"),
});

export const albums = pgTable("albums", {
  id: uuid("id").primaryKey().notNull(),
  memorialId: uuid("memorial_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  coverMediaId: uuid("cover_media_id"),
  visibility: text("visibility").notNull(),
  status: text("status").notNull(),
  displayOrder: integer("display_order").notNull(),
  deletedAt: ts("deleted_at"),
});

export const media = pgTable("media", {
  id: uuid("id").primaryKey().notNull(),
  memorialId: uuid("memorial_id").notNull(),
  albumId: uuid("album_id"),
  storageBucket: text("storage_bucket").notNull(),
  storagePath: text("storage_path").notNull(),
  kind: text("kind").notNull(),
  mimeType: text("mime_type"),
  byteSize: bigint("byte_size", { mode: "number" }),
  width: integer("width"),
  height: integer("height"),
  checksum: text("checksum"),
  caption: text("caption"),
  altText: text("alt_text"),
  source: text("source").notNull(),
  visibility: text("visibility").notNull(),
  processingStatus: text("processing_status").notNull(),
  displayOrder: integer("display_order").notNull(),
  uploadedBy: uuid("uploaded_by"),
  deletedAt: ts("deleted_at"),
});

export const milestones = pgTable("milestones", {
  id: uuid("id").primaryKey().notNull(),
  memorialId: uuid("memorial_id").notNull(),
  year: integer("year").notNull(),
  onDate: text("on_date"),
  title: text("title").notNull(),
  description: text("description"),
  visibility: text("visibility").notNull(),
  status: text("status").notNull(),
  displayOrder: integer("display_order").notNull(),
  deletedAt: ts("deleted_at"),
});

export const tributes = pgTable("tributes", {
  id: uuid("id").primaryKey().notNull(),
  memorialId: uuid("memorial_id").notNull(),
  status: text("status").notNull(),
  authorDisplayName: text("author_display_name").notNull(),
  authorRelationship: text("author_relationship"),
  authorEmail: text("author_email"),
  message: text("message").notNull(),
  mediaId: uuid("media_id"),
  editToken: uuid("edit_token").notNull(),
  submittedIp: text("submitted_ip"),
  submittedUserAgent: text("submitted_user_agent"),
  moderatedBy: uuid("moderated_by"),
  moderatedAt: ts("moderated_at"),
  moderationNote: text("moderation_note"),
  publishedAt: ts("published_at"),
  createdAt: ts("created_at").notNull(),
  deletedAt: ts("deleted_at"),
});

export const funeralEvents = pgTable("funeral_events", {
  id: uuid("id").primaryKey().notNull(),
  memorialId: uuid("memorial_id").notNull(),
  eventType: text("event_type").notNull(),
  status: text("status").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: text("event_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  timezone: text("timezone"),
  venueName: text("venue_name"),
  addressLine: text("address_line"),
  city: text("city"),
  region: text("region"),
  country: text("country"),
  postalCode: text("postal_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  dressCode: text("dress_code"),
  contacts: jsonb("contacts").$type<FuneralEventContact[]>().notNull(),
  livestreamUrl: text("livestream_url"),
  instructions: text("instructions"),
  visibility: text("visibility").notNull(),
  displayOrder: integer("display_order").notNull(),
  publishedAt: ts("published_at"),
  cancelledAt: ts("cancelled_at"),
  cancelReason: text("cancel_reason"),
  deletedAt: ts("deleted_at"),
});

export const shareResolvers = pgTable("share_resolvers", {
  id: uuid("id").primaryKey().notNull(),
  token: text("token").notNull(),
  memorialId: uuid("memorial_id").notNull(),
  label: text("label"),
  medium: text("medium"),
  isActive: boolean("is_active").notNull(),
  createdBy: uuid("created_by"),
  createdAt: ts("created_at").notNull(),
  retiredAt: ts("retired_at"),
});

export const familyUpdates = pgTable("family_updates", {
  id: uuid("id").primaryKey().notNull(),
  memorialId: uuid("memorial_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  importance: text("importance").notNull(),
  authorProfileId: uuid("author_profile_id"),
  funeralEventId: uuid("funeral_event_id"),
  status: text("status").notNull(),
  visibility: text("visibility").notNull(),
  publishedAt: ts("published_at"),
  createdAt: ts("created_at").notNull(),
  deletedAt: ts("deleted_at"),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().notNull(),
  memorialId: uuid("memorial_id"),
  tributeId: uuid("tribute_id"),
  reporterProfileId: uuid("reporter_profile_id"),
  reporterEmail: text("reporter_email"),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull(),
  resolvedBy: uuid("resolved_by"),
  resolvedAt: ts("resolved_at"),
  resolutionNote: text("resolution_note"),
  submittedIp: text("submitted_ip"),
  createdAt: ts("created_at").notNull(),
});

export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().notNull(),
  memorialId: uuid("memorial_id"),
  requestedBy: uuid("requested_by"),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  serviceType: text("service_type").notNull(),
  details: text("details"),
  status: text("status").notNull(),
  assignedTo: uuid("assigned_to"),
  internalNotes: text("internal_notes"),
  resolvedAt: ts("resolved_at"),
  submittedIp: text("submitted_ip"),
  createdAt: ts("created_at").notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().notNull(),
  displayName: text("display_name").notNull(),
  isPlatformAdmin: boolean("is_platform_admin").notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().notNull(),
  recipientProfileId: uuid("recipient_profile_id"),
  recipientEmail: text("recipient_email"),
  memorialId: uuid("memorial_id"),
  eventType: text("event_type").notNull(),
  channel: text("channel").notNull(),
  payload: jsonb("payload").notNull(),
  readAt: ts("read_at"),
  sentAt: ts("sent_at"),
  createdAt: ts("created_at").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  // generated identity — never inserted by the adapter
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  actorProfileId: uuid("actor_profile_id"),
  actorKind: text("actor_kind").$type<AuditActorKind>().notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  memorialId: uuid("memorial_id"),
  metadata: jsonb("metadata").notNull(),
  createdAt: ts("created_at").notNull(),
});
