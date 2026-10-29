import type {
  FuneralEventContact,
  FuneralEventStatus,
  FuneralEventType,
  MemorialGender,
  MemorialId,
  MemorialRole,
  MembershipStatus,
  MemorialStatus,
  MemorialVisibility,
  NotificationChannel,
  NotificationEventType,
  ProfileId,
  PublicationStatus,
  ReportReason,
  ReportStatus,
  ServiceRequestStatus,
  ServiceRequestType,
  SectionVisibility,
  StorySectionKind,
  TributeStatus,
  UpdateImportance,
} from "@evermora/types";

/**
 * Plain domain row shapes returned by repositories. camelCase, framework- and
 * DB-driver-independent. The database adapter maps snake_case rows onto these;
 * the domain never sees a raw DB row, a Drizzle result, or a Supabase type.
 */

export interface MemorialRow {
  id: MemorialId;
  status: MemorialStatus;
  funeralPlanningStatus: string;
  createdBy: ProfileId | null;
  fullName: string;
  preferredName: string | null;
  headline: string | null;
  survivedBy: string | null;
  gender: MemorialGender | null;
  biographySummary: string | null;
  dateOfBirth: string | null;
  /** Only the year of `dateOfBirth` is known (stored as YYYY-01-01). */
  birthYearOnly: boolean;
  dateOfDeath: string | null;
  birthPlace: string | null;
  restingPlace: string | null;
  portraitMediaId: string | null;
  /** Chosen link-preview image, independent of the on-page portrait. Falls
   *  back to the portrait, then the first gallery photo, then initials. */
  coverMediaId: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  suspendedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewMemorial {
  id: string;
  createdBy: ProfileId;
  fullName: string;
  preferredName?: string | null;
  headline?: string | null;
  dateOfBirth?: string | null;
  dateOfDeath?: string | null;
  birthPlace?: string | null;
  status: "draft";
}

/**
 * Editable memorial profile fields. Every key is optional; only the keys
 * present are written (`undefined` = leave unchanged, `null` = clear).
 */
export interface MemorialProfilePatch {
  fullName?: string;
  preferredName?: string | null;
  headline?: string | null;
  survivedBy?: string | null;
  gender?: MemorialGender | null;
  biographySummary?: string | null;
  dateOfBirth?: string | null;
  birthYearOnly?: boolean;
  dateOfDeath?: string | null;
  birthPlace?: string | null;
  restingPlace?: string | null;
}

/** Platform-moderation status change (Phase 5M). */
export interface MemorialStatusPatch {
  status: MemorialStatus;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
}

export interface MemorialSlugRow {
  id: string;
  memorialId: MemorialId;
  slug: string;
  isCanonical: boolean;
  redirectEnabled: boolean;
  retiredAt: string | null;
  createdAt: string;
}

export interface PrivacySettingsRow {
  memorialId: MemorialId;
  visibility: MemorialVisibility;
  searchIndexingEnabled: boolean;
}

/** Editable memorial-level privacy fields (section visibility is a later phase). */
export interface PrivacySettingsPatch {
  visibility?: MemorialVisibility;
  searchIndexingEnabled?: boolean;
}

/** Editable product toggles exposed in the family "Customize" surface (MVP subset). */
export interface FeatureSettingsPatch {
  tributesEnabled?: boolean;
  tributeModerationEnabled?: boolean;
  photoContributionsEnabled?: boolean;
  candlesEnabled?: boolean;
  funeralEnabled?: boolean;
  updatesEnabled?: boolean;
  sharingEnabled?: boolean;
}

export interface FeatureSettingsRow {
  memorialId: MemorialId;
  tributesEnabled: boolean;
  tributeModerationEnabled: boolean;
  photoContributionsEnabled: boolean;
  candlesEnabled: boolean;
  funeralEnabled: boolean;
  familySectionEnabled: boolean;
  updatesEnabled: boolean;
  guestbookEnabled: boolean;
  sharingEnabled: boolean;
  qrCodeEnabled: boolean;
  visitorAnalyticsEnabled: boolean;
}

// --- Story sections & milestones (Phase 5E) --------------------------------

export interface StorySectionRow {
  id: string;
  memorialId: MemorialId;
  kind: StorySectionKind;
  title: string;
  body: string;
  visibility: SectionVisibility;
  status: PublicationStatus;
  displayOrder: number;
}

export interface NewStorySection {
  id: string;
  memorialId: MemorialId;
  kind: StorySectionKind;
  title: string;
  body: string;
  visibility: SectionVisibility;
  status: PublicationStatus;
  displayOrder: number;
}

export interface StorySectionPatch {
  kind?: StorySectionKind;
  title?: string;
  body?: string;
  visibility?: SectionVisibility;
  status?: PublicationStatus;
  displayOrder?: number;
}

export interface MilestoneRow {
  id: string;
  memorialId: MemorialId;
  year: number;
  onDate: string | null;
  title: string;
  description: string | null;
  visibility: SectionVisibility;
  status: PublicationStatus;
  displayOrder: number;
}

export interface NewMilestone {
  id: string;
  memorialId: MemorialId;
  year: number;
  onDate: string | null;
  title: string;
  description: string | null;
  visibility: SectionVisibility;
  status: PublicationStatus;
  displayOrder: number;
}

export interface MilestonePatch {
  year?: number;
  onDate?: string | null;
  title?: string;
  description?: string | null;
  visibility?: SectionVisibility;
  status?: PublicationStatus;
  displayOrder?: number;
}

// --- Albums & media (Phase 5F) --------------------------------------------

export type MediaKind = "image" | "video" | "audio" | "document";
export type MediaProcessingStatus = "pending" | "ready" | "failed";

export interface AlbumRow {
  id: string;
  memorialId: MemorialId;
  title: string;
  description: string | null;
  coverMediaId: string | null;
  visibility: SectionVisibility;
  status: PublicationStatus;
  displayOrder: number;
}

export interface NewAlbum {
  id: string;
  memorialId: MemorialId;
  title: string;
  description: string | null;
  visibility: SectionVisibility;
  status: PublicationStatus;
  displayOrder: number;
}

export interface AlbumPatch {
  title?: string;
  description?: string | null;
  coverMediaId?: string | null;
  visibility?: SectionVisibility;
  status?: PublicationStatus;
  displayOrder?: number;
}

export interface MediaRow {
  id: string;
  memorialId: MemorialId;
  albumId: string | null;
  storageBucket: string;
  storagePath: string;
  kind: MediaKind;
  mimeType: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  checksum: string | null;
  caption: string | null;
  altText: string | null;
  visibility: SectionVisibility;
  processingStatus: MediaProcessingStatus;
  displayOrder: number;
}

export interface NewMedia {
  id: string;
  memorialId: MemorialId;
  albumId: string | null;
  storageBucket: string;
  storagePath: string;
  kind: MediaKind;
  mimeType: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  checksum: string | null;
  caption: string | null;
  altText: string | null;
  visibility: SectionVisibility;
  displayOrder: number;
  uploadedBy: ProfileId;
}

export interface MediaPatch {
  albumId?: string | null;
  caption?: string | null;
  altText?: string | null;
  visibility?: SectionVisibility;
  displayOrder?: number;
}

// --- Tributes & reports (Phase 5G) ---------------------------------------

/**
 * A tribute as seen through its private edit token — only the fields an
 * anonymous visitor's own edit form needs. Deliberately narrower than
 * `TributeRow`: `findByEditToken` / `editByToken` are backed by a SECURITY
 * DEFINER RPC that was never given the rest (moderator stamps, IP, etc).
 */
export interface TributeEditView {
  id: string;
  memorialId: MemorialId;
  status: TributeStatus;
  authorDisplayName: string;
  authorRelationship: string | null;
  message: string;
}

export interface TributeRow {
  id: string;
  memorialId: MemorialId;
  status: TributeStatus;
  authorDisplayName: string;
  authorRelationship: string | null;
  message: string;
  mediaId: string | null;
  /** PRIVATE — the submitter's only proof of authorship. Never for anon reads. */
  editToken: string;
  moderatedBy: ProfileId | null;
  moderatedAt: string | null;
  moderationNote: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface NewTribute {
  id: string;
  memorialId: MemorialId;
  status: Extract<TributeStatus, "pending" | "approved">;
  authorDisplayName: string;
  authorRelationship: string | null;
  authorEmail: string | null;
  message: string;
  mediaId: string | null;
  /** Generated by the caller (`anon` has no SELECT/RETURNING on this table to read a DB default back). */
  editToken: string;
  submittedIp: string | null;
  submittedUserAgent: string | null;
  publishedAt: string | null;
}

export interface TributeModerationPatch {
  status: TributeStatus;
  moderatedBy: ProfileId;
  moderatedAt: string;
  publishedAt?: string | null;
  moderationNote?: string | null;
}

export interface NewReport {
  id: string;
  memorialId: MemorialId | null;
  tributeId: string | null;
  reporterProfileId: ProfileId | null;
  reporterEmail: string | null;
  reason: ReportReason;
  details: string | null;
  /** Private — never read back; used only for the anon per-IP rate limit. */
  submittedIp: string | null;
}

// --- Service requests (Phase 5L) -------------------------------------

export interface NewServiceRequest {
  id: string;
  memorialId: MemorialId | null;
  requestedBy: ProfileId | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  serviceType: ServiceRequestType;
  details: string | null;
  /** Private — never read back; used only for the anon per-IP rate limit. */
  submittedIp: string | null;
}

// --- Platform admin (Phase 5M) --------------------------------------

export interface ReportRow {
  id: string;
  memorialId: string | null;
  tributeId: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export interface ReportResolution {
  status: ReportStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface ServiceRequestRow {
  id: string;
  memorialId: string | null;
  requestedBy: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  serviceType: ServiceRequestType;
  details: string | null;
  status: ServiceRequestStatus;
  assignedTo: string | null;
  internalNotes: string | null;
  createdAt: string;
}

export interface ServiceRequestPatch {
  status?: ServiceRequestStatus;
  assignedTo?: string | null;
  internalNotes?: string | null;
  resolvedAt?: string | null;
}

// --- Funeral events (Phase 5H) ------------------------------------------

/** The location + logistics fields common to a funeral event, all optional. */
export interface FuneralEventDetails {
  description?: string | null;
  eventDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  timezone?: string | null;
  venueName?: string | null;
  addressLine?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  dressCode?: string | null;
  /** RSVP contacts, at most `MAX_FUNERAL_EVENT_CONTACTS`. `[]` = none. */
  contacts?: FuneralEventContact[];
  livestreamUrl?: string | null;
  instructions?: string | null;
}

export interface FuneralEventRow extends Required<FuneralEventDetails> {
  id: string;
  memorialId: MemorialId;
  eventType: FuneralEventType;
  status: FuneralEventStatus;
  title: string;
  visibility: SectionVisibility;
  displayOrder: number;
  publishedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface NewFuneralEvent extends FuneralEventDetails {
  id: string;
  memorialId: MemorialId;
  eventType: FuneralEventType;
  title: string;
  visibility: SectionVisibility;
  displayOrder: number;
}

export interface FuneralEventPatch extends FuneralEventDetails {
  eventType?: FuneralEventType;
  title?: string;
  visibility?: SectionVisibility;
}

/** Status / stamp changes applied by the lifecycle operations. */
export interface FuneralEventLifecyclePatch {
  status: FuneralEventStatus;
  publishedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
}

// --- Family updates (Phase 5I) ----------------------------------------

export interface FamilyUpdateRow {
  id: string;
  memorialId: MemorialId;
  title: string;
  body: string;
  importance: UpdateImportance;
  authorProfileId: string | null;
  funeralEventId: string | null;
  status: PublicationStatus;
  visibility: SectionVisibility;
  publishedAt: string | null;
  createdAt: string;
}

export interface NewFamilyUpdate {
  id: string;
  memorialId: MemorialId;
  title: string;
  body: string;
  importance: UpdateImportance;
  authorProfileId: string | null;
  funeralEventId: string | null;
  visibility: SectionVisibility;
}

export interface FamilyUpdatePatch {
  title?: string;
  body?: string;
  importance?: UpdateImportance;
  funeralEventId?: string | null;
  visibility?: SectionVisibility;
}

/** Status / stamp changes applied by the family-update lifecycle operations. */
export interface FamilyUpdateLifecyclePatch {
  status: PublicationStatus;
  publishedAt?: string | null;
}

// --- Share resolvers (Phase 5J) --------------------------------------

export interface ShareResolverRow {
  id: string;
  memorialId: MemorialId;
  token: string;
  label: string | null;
  medium: string | null;
  isActive: boolean;
  createdAt: string;
  retiredAt: string | null;
}

export interface NewShareResolver {
  id: string;
  memorialId: MemorialId;
  label: string | null;
  medium: string | null;
  createdBy: string | null;
}

// --- Notifications (Phase 5N) --------------------------------------

export interface NewNotification {
  id: string;
  recipientProfileId: string | null;
  recipientEmail: string | null;
  memorialId: string | null;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  payload: Record<string, unknown>;
}

export interface NotificationRow {
  id: string;
  memorialId: string | null;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export type AuditActorKind = "user" | "platform_admin" | "system" | "anonymous";

export interface AuditEntry {
  actorProfileId: ProfileId | null;
  actorKind: AuditActorKind;
  action: string;
  entityType: string;
  entityId: string;
  memorialId: MemorialId | null;
  metadata?: Record<string, unknown>;
}

export interface MembershipRow {
  memorialId: MemorialId;
  profileId: ProfileId;
  role: MemorialRole;
  status: string;
}

// --- Family access / memberships (Phase 5K) --------------------------

export interface MembershipDetailRow {
  id: string;
  memorialId: MemorialId;
  profileId: string | null;
  invitedEmail: string | null;
  role: MemorialRole;
  status: MembershipStatus;
  invitedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export interface NewMembershipInvite {
  id: string;
  memorialId: MemorialId;
  profileId: string | null;
  invitedEmail: string;
  role: MemorialRole;
  invitedBy: string | null;
}

export interface MembershipPatch {
  role?: MemorialRole;
  status?: MembershipStatus;
  revokedAt?: string | null;
}
