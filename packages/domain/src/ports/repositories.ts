import type {
  FuneralPlanningStatus,
  MemorialId,
  MemorialRole,
  ProfileId,
  TributeStatus,
} from "@evermora/types";
import type {
  AlbumPatch,
  AlbumRow,
  AuditEntry,
  FamilyUpdateLifecyclePatch,
  FamilyUpdatePatch,
  FamilyUpdateRow,
  FeatureSettingsPatch,
  FeatureSettingsRow,
  FuneralEventLifecyclePatch,
  FuneralEventPatch,
  FuneralEventRow,
  MediaPatch,
  MediaRow,
  MembershipDetailRow,
  MembershipPatch,
  MembershipRow,
  NewMembershipInvite,
  MemorialProfilePatch,
  MemorialStatusPatch,
  MemorialRow,
  MemorialSlugRow,
  MilestonePatch,
  MilestoneRow,
  NewAlbum,
  NewFamilyUpdate,
  NewFuneralEvent,
  NewMedia,
  NewMemorial,
  NewNotification,
  NewMilestone,
  NewReport,
  ReportResolution,
  ReportRow,
  NewServiceRequest,
  ServiceRequestPatch,
  ServiceRequestRow,
  NewShareResolver,
  NewStorySection,
  NotificationRow,
  NewTribute,
  TributeEditView,
  PrivacySettingsPatch,
  PrivacySettingsRow,
  ShareResolverRow,
  StorySectionPatch,
  StorySectionRow,
  TributeModerationPatch,
  TributeRow,
} from "./rows";

/**
 * Repository ports consumed by `@evermora/domain`. Each exposes only the reads
 * and writes the core-memorial operations need — not a generic ORM surface.
 * Concrete implementations live in `@evermora/database` and run inside a
 * `UnitOfWork` transaction whose RLS context matches the caller.
 */

export interface MemorialRepository {
  create(input: NewMemorial): Promise<MemorialRow>;
  /** NULL when the memorial does not exist *or* is not visible to the caller (RLS). */
  findById(id: MemorialId): Promise<MemorialRow | null>;
  markPublished(id: MemorialId, publishedAt: Date): Promise<MemorialRow>;
  /**
   * Apply a partial profile update. Only the keys present in `patch` are
   * written. Throws if the update matches no row (RLS denied / not found) —
   * the caller has already checked the permission, so that is `internal`.
   */
  updateProfile(id: MemorialId, patch: MemorialProfilePatch): Promise<MemorialRow>;
  /** Set (or clear with null) the memorial's portrait media reference. */
  setPortrait(id: MemorialId, mediaId: string | null): Promise<MemorialRow>;
  /** Set (or clear with null) the memorial's link-preview cover image. */
  setCover(id: MemorialId, mediaId: string | null): Promise<MemorialRow>;
  /** Set the memorial's funeral planning status (independent of lifecycle). */
  setFuneralPlanningStatus(id: MemorialId, status: FuneralPlanningStatus): Promise<MemorialRow>;
  /** Platform moderation: set status + suspension stamps (Phase 5M). */
  setStatus(id: MemorialId, patch: MemorialStatusPatch): Promise<MemorialRow>;
}

export interface MembershipRepository {
  /** The caller's active role on a memorial, or NULL. Mirrors `app.memorial_role`. */
  activeRole(memorialId: MemorialId, profileId: ProfileId): Promise<MemorialRole | null>;
  /** All active memberships for a memorial (used for defensive invariants). */
  activeFor(memorialId: MemorialId): Promise<MembershipRow[]>;

  // --- Phase 5K: family access ---
  /** Every membership row for a memorial (any status), newest first. RLS-scoped. */
  listForMemorial(memorialId: MemorialId): Promise<MembershipDetailRow[]>;
  detailById(id: string): Promise<MembershipDetailRow | null>;
  /** A pending (status='invited') invite for this memorial + email, if any. */
  pendingInviteFor(memorialId: MemorialId, email: string): Promise<MembershipDetailRow | null>;
  /** Active membership for a profile on this memorial, if any. */
  activeForProfile(memorialId: MemorialId, profileId: string): Promise<MembershipDetailRow | null>;
  createInvite(input: NewMembershipInvite): Promise<MembershipDetailRow>;
  applyPatch(id: string, patch: MembershipPatch): Promise<MembershipDetailRow>;
  /**
   * Move ownership: demote the current active owner to `admin`, then promote the
   * target profile to `owner` — ordered so the one-active-owner index never sees
   * two. Returns the previous owner's profile id.
   */
  transferOwnership(
    memorialId: MemorialId,
    newOwnerProfileId: string,
  ): Promise<{ previousOwnerProfileId: string }>;
}

export interface MemorialSlugRepository {
  /** Resolve a slug across *all* memorials (canonical or alias). */
  findBySlug(slug: string): Promise<MemorialSlugRow | null>;
  /** Every slug row a memorial has ever had. */
  listForMemorial(memorialId: MemorialId): Promise<MemorialSlugRow[]>;
  canonicalFor(memorialId: MemorialId): Promise<MemorialSlugRow | null>;
  /** True when the slug is in the reserved-route registry. Mirrors `reserved_slugs`. */
  isReserved(slug: string): Promise<boolean>;
  /**
   * Insert a new canonical slug for the memorial. Throws the driver's unique
   * violation if the slug is taken — the adapter surfaces that; the operation
   * maps it to `SlugUnavailableError` (race-safe).
   */
  addCanonical(input: {
    id: string;
    memorialId: MemorialId;
    slug: string;
    createdBy: ProfileId;
  }): Promise<MemorialSlugRow>;
  /** Demote the current canonical slug to a retired alias. */
  retireCanonical(memorialId: MemorialId, retiredAt: Date): Promise<void>;
  /** Re-promote an existing (retired) alias of this memorial back to canonical. */
  promoteExistingToCanonical(slugRowId: string): Promise<MemorialSlugRow>;
}

export interface SettingsRepository {
  /** Both rows are auto-created by a DB trigger on memorial insert; the domain reads them. */
  privacy(memorialId: MemorialId): Promise<PrivacySettingsRow | null>;
  feature(memorialId: MemorialId): Promise<FeatureSettingsRow | null>;
  /** Partial update of the memorial-level privacy row. Returns the new state. */
  updatePrivacy(memorialId: MemorialId, patch: PrivacySettingsPatch): Promise<PrivacySettingsRow>;
  /** Partial update of the product-toggle row. Returns the new state. */
  updateFeature(memorialId: MemorialId, patch: FeatureSettingsPatch): Promise<FeatureSettingsRow>;
}

export interface StoryRepository {
  /** All non-deleted story sections for a memorial, ordered by displayOrder. RLS-scoped. */
  listForMemorial(memorialId: MemorialId): Promise<StorySectionRow[]>;
  findById(id: string): Promise<StorySectionRow | null>;
  create(input: NewStorySection): Promise<StorySectionRow>;
  update(id: string, patch: StorySectionPatch): Promise<StorySectionRow>;
  /** Soft-delete (sets deleted_at). */
  softDelete(id: string): Promise<void>;
  /** Set displayOrder for several sections at once (already validated to belong to the memorial). */
  setOrder(entries: { id: string; displayOrder: number }[]): Promise<void>;
  /** Count of `published`, non-deleted sections — used by the publish content bar. */
  publishedCount(memorialId: MemorialId): Promise<number>;
}

export interface MilestoneRepository {
  listForMemorial(memorialId: MemorialId): Promise<MilestoneRow[]>;
  findById(id: string): Promise<MilestoneRow | null>;
  create(input: NewMilestone): Promise<MilestoneRow>;
  update(id: string, patch: MilestonePatch): Promise<MilestoneRow>;
  softDelete(id: string): Promise<void>;
  setOrder(entries: { id: string; displayOrder: number }[]): Promise<void>;
}

export interface AlbumRepository {
  listForMemorial(memorialId: MemorialId): Promise<AlbumRow[]>;
  findById(id: string): Promise<AlbumRow | null>;
  create(input: NewAlbum): Promise<AlbumRow>;
  update(id: string, patch: AlbumPatch): Promise<AlbumRow>;
  softDelete(id: string): Promise<void>;
  setOrder(entries: { id: string; displayOrder: number }[]): Promise<void>;
}

export interface MediaRepository {
  listForMemorial(memorialId: MemorialId): Promise<MediaRow[]>;
  findById(id: string): Promise<MediaRow | null>;
  create(input: NewMedia): Promise<MediaRow>;
  update(id: string, patch: MediaPatch): Promise<MediaRow>;
  softDelete(id: string): Promise<void>;
  setOrder(entries: { id: string; displayOrder: number }[]): Promise<void>;
  /** Detach every media row from an album (used when the album is removed). */
  clearAlbum(albumId: string): Promise<void>;
  /** Count of `ready`, non-deleted media — used by the publish content bar / portrait check. */
  readyCount(memorialId: MemorialId): Promise<number>;
}

export interface TributeRepository {
  /** RLS: members / moderators / platform admins see the base row. */
  findById(id: string): Promise<TributeRow | null>;
  create(input: NewTribute): Promise<TributeRow>;
  /** Apply a moderation decision (status + moderator stamps). */
  moderate(id: string, patch: TributeModerationPatch): Promise<TributeRow>;
  /** Count `pending` (+ optionally `reported`) tributes — for the queue badge. */
  pendingCount(memorialId: MemorialId): Promise<number>;
  /** How many tributes this IP has submitted to this memorial since `sinceIso` — rate limit. */
  recentFromIp(memorialId: MemorialId, ip: string, sinceIso: string): Promise<number>;
  /**
   * Look up a tribute by its private edit token — a SECURITY DEFINER RPC,
   * since RLS has no concept of "anonymous token ownership" and `anon` has
   * no SELECT grant on the base table. Null for an unknown/deleted tribute.
   */
  findByEditToken(token: string): Promise<TributeEditView | null>;
  /**
   * Apply the visitor's own edit, re-verified by the same token. `status` is
   * decided by the caller (editTribute derives it from
   * `tribute_moderation_enabled`) — this does not re-derive it. Null if the
   * token no longer matches anything.
   */
  editByToken(
    token: string,
    patch: {
      authorDisplayName: string;
      authorRelationship: string | null;
      message: string;
      status: Extract<TributeStatus, "pending" | "approved">;
    },
  ): Promise<TributeEditView | null>;
}

export interface ReportRepository {
  create(input: NewReport): Promise<{ id: string }>;
  /** Platform staff (Phase 5M). */
  findById(id: string): Promise<ReportRow | null>;
  resolve(id: string, patch: ReportResolution): Promise<ReportRow>;
  /** Count of reports from an IP since a time, across all memorials (Phase 5O anti-abuse). */
  recentFromIp(ip: string, sinceIso: string): Promise<number>;
}

export interface ServiceRequestRepository {
  /** Insert one enquiry as `status='new'`, unassigned. */
  create(input: NewServiceRequest): Promise<{ id: string }>;
  /** Platform staff / assignee (Phase 5M). */
  findById(id: string): Promise<ServiceRequestRow | null>;
  update(id: string, patch: ServiceRequestPatch): Promise<ServiceRequestRow>;
  /** Count of service requests from an IP since a time (Phase 5O anti-abuse). */
  recentFromIp(ip: string, sinceIso: string): Promise<number>;
}

export interface FuneralEventRepository {
  listForMemorial(memorialId: MemorialId): Promise<FuneralEventRow[]>;
  findById(id: string): Promise<FuneralEventRow | null>;
  create(input: NewFuneralEvent): Promise<FuneralEventRow>;
  update(id: string, patch: FuneralEventPatch): Promise<FuneralEventRow>;
  applyLifecycle(id: string, patch: FuneralEventLifecyclePatch): Promise<FuneralEventRow>;
  softDelete(id: string): Promise<void>;
  setOrder(entries: { id: string; displayOrder: number }[]): Promise<void>;
  /** Count of `published`, non-deleted events — for the memorial overview. */
  publishedCount(memorialId: MemorialId): Promise<number>;
}

export interface FamilyUpdateRepository {
  listForMemorial(memorialId: MemorialId): Promise<FamilyUpdateRow[]>;
  findById(id: string): Promise<FamilyUpdateRow | null>;
  create(input: NewFamilyUpdate): Promise<FamilyUpdateRow>;
  update(id: string, patch: FamilyUpdatePatch): Promise<FamilyUpdateRow>;
  applyLifecycle(id: string, patch: FamilyUpdateLifecyclePatch): Promise<FamilyUpdateRow>;
  softDelete(id: string): Promise<void>;
  /** Count of `published`, non-deleted updates — for the memorial overview. */
  publishedCount(memorialId: MemorialId): Promise<number>;
}

export interface ShareResolverRepository {
  listForMemorial(memorialId: MemorialId): Promise<ShareResolverRow[]>;
  findById(id: string): Promise<ShareResolverRow | null>;
  /** Insert one resolver; `token` is generated by the database. */
  create(input: NewShareResolver): Promise<ShareResolverRow>;
  /** Retire one resolver (`is_active = false`, `retired_at = now`). Never deleted. */
  retire(id: string): Promise<ShareResolverRow>;
}

export interface NotificationRepository {
  /**
   * Append notification rows **in the operation's transaction** (a narrow
   * `service_role` escalation for this insert only — `authenticated` has no
   * INSERT path). `channel = 'in_app'` rows show in the in-app centre now;
   * `channel = 'email'` rows are picked up by the delivery worker (Phase 5N+ /
   * provider TBD).
   */
  recordMany(entries: NewNotification[]): Promise<void>;
  /**
   * The active-member profile ids for a memorial, for fan-out. Elevated: an
   * anonymous tribute submitter (or a non-member) cannot read
   * `memorial_memberships` under RLS, but still triggers member notifications.
   */
  memorialRecipientIds(memorialId: string): Promise<string[]>;
  /** The signed-in recipient's own notifications, newest first. RLS-scoped. */
  listForRecipient(
    profileId: string,
    opts?: { unreadOnly?: boolean; limit?: number },
  ): Promise<NotificationRow[]>;
  unreadCount(profileId: string): Promise<number>;
  markRead(ids: string[], profileId: string): Promise<void>;
  markAllRead(profileId: string): Promise<void>;
}

export interface ProfileRepository {
  /** Profile ids of every platform-staff account (for staff-wide notifications). */
  platformAdminIds(): Promise<string[]>;
}

export interface AuditRepository {
  /**
   * Append one row to `audit_logs`, in the operation's transaction. The adapter
   * performs a narrow, temporary `service_role` elevation for this insert only
   * (the table denies `authenticated` an INSERT path by design) and restores
   * the caller's RLS role afterwards.
   */
  record(entry: AuditEntry): Promise<void>;
}

export interface Repositories {
  memorials: MemorialRepository;
  memberships: MembershipRepository;
  slugs: MemorialSlugRepository;
  settings: SettingsRepository;
  story: StoryRepository;
  milestones: MilestoneRepository;
  albums: AlbumRepository;
  media: MediaRepository;
  tributes: TributeRepository;
  reports: ReportRepository;
  serviceRequests: ServiceRequestRepository;
  funeralEvents: FuneralEventRepository;
  familyUpdates: FamilyUpdateRepository;
  shareResolvers: ShareResolverRepository;
  notifications: NotificationRepository;
  profiles: ProfileRepository;
  audit: AuditRepository;
}
