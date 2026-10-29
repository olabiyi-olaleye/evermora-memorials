import type { MemorialId, MemorialRole, ProfileId, TributeStatus } from "@evermora/types";
import type { CallerContext } from "../context";
import type {
  AlbumPatch,
  AlbumRow,
  AuditEntry,
  FeatureSettingsPatch,
  FeatureSettingsRow,
  MediaPatch,
  MediaRow,
  MembershipDetailRow,
  MembershipPatch,
  MembershipRow,
  NewMembershipInvite,
  MemorialProfilePatch,
  MemorialRow,
  MemorialSlugRow,
  MilestonePatch,
  FamilyUpdateLifecyclePatch,
  FamilyUpdatePatch,
  FamilyUpdateRow,
  FuneralEventLifecyclePatch,
  FuneralEventPatch,
  FuneralEventRow,
  MilestoneRow,
  NewAlbum,
  NewFamilyUpdate,
  NewMedia,
  NewMemorial,
  NewFuneralEvent,
  NewMilestone,
  NewShareResolver,
  ShareResolverRow,
  MemorialStatusPatch,
  NewNotification,
  NewReport,
  NotificationRow,
  ReportResolution,
  ReportRow,
  NewServiceRequest,
  ServiceRequestPatch,
  ServiceRequestRow,
  NewStorySection,
  NewTribute,
  PrivacySettingsPatch,
  PrivacySettingsRow,
  StorySectionPatch,
  StorySectionRow,
  TributeEditView,
  TributeModerationPatch,
  TributeRow,
} from "../ports/rows";
import type { Repositories } from "../ports/repositories";
import { UniqueViolation, type UnitOfWork } from "../ports/unit-of-work";

/**
 * An in-memory `UnitOfWork` that faithfully models the database invariants the
 * DB enforces via triggers/constraints, so domain unit tests exercise the real
 * operation logic without a database:
 *
 *  - creating a memorial auto-creates the active OWNER membership and the
 *    privacy/feature-settings rows with the DB defaults
 *    (`memorials_grant_creator_owner`, `memorials_provision_settings`)
 *  - `memorial_slugs.slug` is globally unique → `UniqueViolation`
 *  - exactly one canonical slug per memorial
 *  - the reserved-slug registry
 *  - a transaction that throws rolls back every change made inside it
 *
 * It does NOT model RLS row-visibility (the DB integration tests cover that);
 * `findById` returns any memorial that exists.
 */

const RESERVED = new Set([
  "about",
  "contact",
  "pricing",
  "services",
  "privacy",
  "terms",
  "login",
  "logout",
  "signup",
  "signin",
  "register",
  "create",
  "new",
  "support",
  "help",
  "admin",
  "api",
  "family",
  "dashboard",
  "settings",
  "account",
  "auth",
  "assets",
  "static",
  "manifest",
  "robots",
  "sitemap",
  "status",
  "billing",
  "notifications",
  "reports",
  "security",
]);

interface StoredStory extends StorySectionRow {
  deletedAt: string | null;
}
interface StoredMilestone extends MilestoneRow {
  deletedAt: string | null;
}
interface StoredAlbum extends AlbumRow {
  deletedAt: string | null;
}
interface StoredMedia extends MediaRow {
  deletedAt: string | null;
}
interface StoredTribute extends TributeRow {
  deletedAt: string | null;
  submittedIp: string | null;
}
interface StoredFuneralEvent extends FuneralEventRow {
  deletedAt: string | null;
}
interface StoredFamilyUpdate extends FamilyUpdateRow {
  deletedAt: string | null;
}
type StoredShareResolver = ShareResolverRow;
type StoredReport = NewReport & Partial<ReportRow>;
type StoredServiceRequest = NewServiceRequest & Partial<ServiceRequestRow>;

function toReportRow(r: StoredReport): ReportRow {
  return {
    id: r.id,
    memorialId: r.memorialId ?? null,
    tributeId: r.tributeId ?? null,
    reason: r.reason,
    details: r.details ?? null,
    status: r.status ?? "open",
    resolvedBy: r.resolvedBy ?? null,
    resolvedAt: r.resolvedAt ?? null,
    resolutionNote: r.resolutionNote ?? null,
    createdAt: r.createdAt ?? "2026-01-01T00:00:00.000Z",
  };
}
function toServiceRequestRow(r: StoredServiceRequest): ServiceRequestRow {
  return {
    id: r.id,
    memorialId: r.memorialId ?? null,
    requestedBy: r.requestedBy ?? null,
    contactName: r.contactName,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone ?? null,
    serviceType: r.serviceType,
    details: r.details ?? null,
    status: r.status ?? "new",
    assignedTo: r.assignedTo ?? null,
    internalNotes: r.internalNotes ?? null,
    createdAt: r.createdAt ?? "2026-01-01T00:00:00.000Z",
  };
}
/** Fixtures may push just the 4 core fields; detail fields are filled on read. */
type StoredMembership = Pick<MembershipDetailRow, "memorialId" | "profileId" | "role" | "status"> &
  Partial<Omit<MembershipDetailRow, "memorialId" | "profileId" | "role" | "status">>;

function toMembershipDetail(m: StoredMembership): MembershipDetailRow {
  return {
    id: m.id ?? `mem-${m.memorialId}-${m.profileId ?? m.invitedEmail ?? "x"}`,
    memorialId: m.memorialId,
    profileId: m.profileId,
    invitedEmail: m.invitedEmail ?? null,
    role: m.role,
    status: m.status,
    invitedBy: m.invitedBy ?? null,
    invitedAt: m.invitedAt ?? "2026-01-01T00:00:00.000Z",
    acceptedAt: m.acceptedAt ?? (m.status === "active" ? "2026-01-01T00:00:00.000Z" : null),
    revokedAt: m.revokedAt ?? null,
  };
}

interface State {
  memorials: Map<string, MemorialRow>;
  memberships: StoredMembership[];
  slugs: MemorialSlugRow[];
  privacy: Map<string, PrivacySettingsRow>;
  feature: Map<string, FeatureSettingsRow>;
  story: StoredStory[];
  milestones: StoredMilestone[];
  albums: StoredAlbum[];
  media: StoredMedia[];
  tributes: StoredTribute[];
  reports: StoredReport[];
  serviceRequests: StoredServiceRequest[];
  funeralEvents: StoredFuneralEvent[];
  familyUpdates: StoredFamilyUpdate[];
  shareResolvers: StoredShareResolver[];
  notifications: {
    id: string;
    recipientProfileId: string | null;
    recipientEmail: string | null;
    memorialId: string | null;
    eventType: NotificationRow["eventType"];
    channel: NotificationRow["channel"];
    payload: Record<string, unknown>;
    readAt: string | null;
    createdAt: string;
  }[];
  platformAdminIds?: string[];
  audit: AuditEntry[];
}

function clone(s: State): State {
  return {
    memorials: new Map([...s.memorials].map(([k, v]) => [k, { ...v }])),
    memberships: s.memberships.map((m) => ({ ...m })),
    slugs: s.slugs.map((r) => ({ ...r })),
    privacy: new Map([...s.privacy].map(([k, v]) => [k, { ...v }])),
    feature: new Map([...s.feature].map(([k, v]) => [k, { ...v }])),
    story: s.story.map((r) => ({ ...r })),
    milestones: s.milestones.map((r) => ({ ...r })),
    albums: s.albums.map((r) => ({ ...r })),
    media: s.media.map((r) => ({ ...r })),
    tributes: s.tributes.map((r) => ({ ...r })),
    reports: s.reports.map((r) => ({ ...r })),
    notifications: s.notifications.map((r) => ({ ...r })),
    platformAdminIds: s.platformAdminIds ? [...s.platformAdminIds] : undefined,
    serviceRequests: s.serviceRequests.map((r) => ({ ...r })),
    funeralEvents: s.funeralEvents.map((r) => ({ ...r })),
    familyUpdates: s.familyUpdates.map((r) => ({ ...r })),
    shareResolvers: s.shareResolvers.map((r) => ({ ...r })),
    audit: s.audit.map((a) => ({ ...a })),
  };
}

const DEFAULT_FEATURES = (memorialId: MemorialId): FeatureSettingsRow => ({
  memorialId,
  tributesEnabled: true,
  tributeModerationEnabled: true,
  photoContributionsEnabled: false,
  candlesEnabled: true,
  funeralEnabled: true,
  familySectionEnabled: false,
  updatesEnabled: true,
  guestbookEnabled: true,
  sharingEnabled: true,
  qrCodeEnabled: true,
  visitorAnalyticsEnabled: true,
});

export interface InMemoryDb {
  unitOfWork: UnitOfWork;
  state: State;
  /** Force the next write of a kind to throw, to test rollback. */
  failNext(
    op:
      | "memorial.create"
      | "memorial.updateProfile"
      | "slug.addCanonical"
      | "settings.updatePrivacy"
      | "settings.updateFeature"
      | "story.create"
      | "story.update"
      | "milestone.create"
      | "milestone.update"
      | "album.create"
      | "media.create"
      | "media.update"
      | "tribute.create"
      | "tribute.moderate"
      | "report.create"
      | "funeral_event.create"
      | "funeral_event.update"
      | "family_update.create"
      | "family_update.update"
      | "audit.record",
  ): void;
}

export function createInMemoryDb(seed?: Partial<State>): InMemoryDb {
  const state: State = {
    memorials: new Map(),
    memberships: [],
    slugs: [],
    privacy: new Map(),
    feature: new Map(),
    story: [],
    milestones: [],
    albums: [],
    media: [],
    tributes: [],
    reports: [],
    serviceRequests: [],
    funeralEvents: [],
    familyUpdates: [],
    shareResolvers: [],
    notifications: [],
    audit: [],
    ...seed,
  };
  let failOn: string | null = null;

  const unitOfWork: UnitOfWork = {
    async transaction<T>(
      _caller: CallerContext,
      work: (repos: Repositories) => Promise<T>,
    ): Promise<T> {
      const snapshot = clone(state);
      try {
        return await work(
          buildRepos(
            state,
            () => failOn,
            (v) => (failOn = v),
          ),
        );
      } catch (err) {
        // rollback
        state.memorials = snapshot.memorials;
        state.memberships = snapshot.memberships;
        state.slugs = snapshot.slugs;
        state.privacy = snapshot.privacy;
        state.feature = snapshot.feature;
        state.story = snapshot.story;
        state.milestones = snapshot.milestones;
        state.albums = snapshot.albums;
        state.media = snapshot.media;
        state.tributes = snapshot.tributes;
        state.reports = snapshot.reports;
        state.notifications = snapshot.notifications;
        state.serviceRequests = snapshot.serviceRequests;
        state.funeralEvents = snapshot.funeralEvents;
        state.familyUpdates = snapshot.familyUpdates;
        state.shareResolvers = snapshot.shareResolvers;
        state.audit = snapshot.audit;
        throw err;
      }
    },
  };

  return {
    unitOfWork,
    state,
    failNext: (op) => {
      failOn = op;
    },
  };
}

function stripStory(r: StoredStory): StorySectionRow {
  const { deletedAt: _d, ...rest } = r;
  void _d;
  return { ...rest };
}
function stripMilestone(r: StoredMilestone): MilestoneRow {
  const { deletedAt: _d, ...rest } = r;
  void _d;
  return { ...rest };
}
function stripAlbum(r: StoredAlbum): AlbumRow {
  const { deletedAt: _d, ...rest } = r;
  void _d;
  return { ...rest };
}
function stripMedia(r: StoredMedia): MediaRow {
  const { deletedAt: _d, ...rest } = r;
  void _d;
  return { ...rest };
}
function stripTribute(r: StoredTribute): TributeRow {
  const { deletedAt: _d, submittedIp: _ip, ...rest } = r;
  void _d;
  void _ip;
  return { ...rest };
}
function toTributeEditView(r: StoredTribute): TributeEditView {
  return {
    id: r.id,
    memorialId: r.memorialId,
    status: r.status,
    authorDisplayName: r.authorDisplayName,
    authorRelationship: r.authorRelationship,
    message: r.message,
  };
}
function stripFuneral(r: StoredFuneralEvent): FuneralEventRow {
  const { deletedAt: _d, ...rest } = r;
  void _d;
  return { ...rest };
}
function stripFamilyUpdate(r: StoredFamilyUpdate): FamilyUpdateRow {
  const { deletedAt: _d, ...rest } = r;
  void _d;
  return { ...rest };
}

function buildRepos(
  state: State,
  getFail: () => string | null,
  setFail: (v: string | null) => void,
): Repositories {
  const nowIso = () => new Date().toISOString();
  const consumeFail = (op: string) => {
    if (getFail() === op) {
      setFail(null);
      throw new Error(`injected failure: ${op}`);
    }
  };

  return {
    memorials: {
      async create(input: NewMemorial): Promise<MemorialRow> {
        consumeFail("memorial.create");
        const id = input.id as MemorialId;
        const row: MemorialRow = {
          id,
          status: "draft",
          funeralPlanningStatus: "not_started",
          createdBy: input.createdBy,
          fullName: input.fullName,
          preferredName: input.preferredName ?? null,
          headline: input.headline ?? null,
          survivedBy: null,
          gender: null,
          biographySummary: null,
          dateOfBirth: input.dateOfBirth ?? null,
          birthYearOnly: false,
          dateOfDeath: input.dateOfDeath ?? null,
          birthPlace: input.birthPlace ?? null,
          restingPlace: null,
          portraitMediaId: null,
          coverMediaId: null,
          publishedAt: null,
          archivedAt: null,
          suspendedAt: null,
          deletedAt: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        state.memorials.set(id, row);
        // triggers
        state.memberships.push({
          id: `mem-${id}`,
          memorialId: id,
          profileId: input.createdBy,
          invitedEmail: null,
          role: "owner",
          status: "active",
          invitedBy: input.createdBy,
          invitedAt: nowIso(),
          acceptedAt: nowIso(),
          revokedAt: null,
        });
        state.privacy.set(id, {
          memorialId: id,
          visibility: "private",
          searchIndexingEnabled: false,
        });
        state.feature.set(id, DEFAULT_FEATURES(id));
        return { ...row };
      },
      async findById(id: MemorialId): Promise<MemorialRow | null> {
        const r = state.memorials.get(id);
        return r ? { ...r } : null;
      },
      async markPublished(id: MemorialId, publishedAt: Date): Promise<MemorialRow> {
        const r = state.memorials.get(id);
        if (!r) throw new Error("no such memorial");
        r.status = "published";
        r.publishedAt = publishedAt.toISOString();
        r.updatedAt = nowIso();
        return { ...r };
      },
      async updateProfile(id: MemorialId, patch: MemorialProfilePatch): Promise<MemorialRow> {
        consumeFail("memorial.updateProfile");
        const r = state.memorials.get(id);
        if (!r) throw new Error("no such memorial");
        for (const [k, v] of Object.entries(patch)) {
          if (v !== undefined) (r as unknown as Record<string, unknown>)[k] = v;
        }
        r.updatedAt = nowIso();
        return { ...r };
      },
      async setPortrait(id: MemorialId, mediaId: string | null): Promise<MemorialRow> {
        const r = state.memorials.get(id);
        if (!r) throw new Error("no such memorial");
        r.portraitMediaId = mediaId;
        r.updatedAt = nowIso();
        return { ...r };
      },
      async setCover(id: MemorialId, mediaId: string | null): Promise<MemorialRow> {
        const r = state.memorials.get(id);
        if (!r) throw new Error("no such memorial");
        r.coverMediaId = mediaId;
        r.updatedAt = nowIso();
        return { ...r };
      },
      async setFuneralPlanningStatus(id: MemorialId, status): Promise<MemorialRow> {
        const r = state.memorials.get(id);
        if (!r) throw new Error("no such memorial");
        r.funeralPlanningStatus = status;
        r.updatedAt = nowIso();
        return { ...r };
      },
      async setStatus(id: MemorialId, patch: MemorialStatusPatch): Promise<MemorialRow> {
        const r = state.memorials.get(id);
        if (!r) throw new Error("no such memorial");
        r.status = patch.status;
        if (patch.suspendedAt !== undefined) r.suspendedAt = patch.suspendedAt;
        r.updatedAt = nowIso();
        return { ...r };
      },
    },
    memberships: {
      async activeRole(memorialId: MemorialId, profileId: ProfileId): Promise<MemorialRole | null> {
        return (
          state.memberships.find(
            (m) =>
              m.memorialId === memorialId && m.profileId === profileId && m.status === "active",
          )?.role ?? null
        );
      },
      async activeFor(memorialId: MemorialId): Promise<MembershipRow[]> {
        return state.memberships
          .filter((m) => m.memorialId === memorialId && m.status === "active" && m.profileId)
          .map((m) => ({
            memorialId: m.memorialId,
            profileId: m.profileId as ProfileId,
            role: m.role,
            status: m.status,
          }));
      },
      async listForMemorial(memorialId: MemorialId): Promise<MembershipDetailRow[]> {
        return state.memberships.filter((m) => m.memorialId === memorialId).map(toMembershipDetail);
      },
      async detailById(id: string): Promise<MembershipDetailRow | null> {
        const m = state.memberships.find((x) => toMembershipDetail(x).id === id);
        return m ? toMembershipDetail(m) : null;
      },
      async pendingInviteFor(
        memorialId: MemorialId,
        email: string,
      ): Promise<MembershipDetailRow | null> {
        const m = state.memberships.find(
          (x) =>
            x.memorialId === memorialId &&
            x.status === "invited" &&
            (x.invitedEmail ?? "").toLowerCase() === email.toLowerCase(),
        );
        return m ? toMembershipDetail(m) : null;
      },
      async activeForProfile(
        memorialId: MemorialId,
        profileId: string,
      ): Promise<MembershipDetailRow | null> {
        const m = state.memberships.find(
          (x) => x.memorialId === memorialId && x.profileId === profileId && x.status === "active",
        );
        return m ? toMembershipDetail(m) : null;
      },
      async createInvite(input: NewMembershipInvite): Promise<MembershipDetailRow> {
        const row: StoredMembership = {
          id: input.id,
          memorialId: input.memorialId,
          profileId: input.profileId,
          invitedEmail: input.invitedEmail,
          role: input.role,
          status: "invited",
          invitedBy: input.invitedBy,
          invitedAt: nowIso(),
          acceptedAt: null,
          revokedAt: null,
        };
        state.memberships.push(row);
        return toMembershipDetail(row);
      },
      async applyPatch(id: string, patch: MembershipPatch): Promise<MembershipDetailRow> {
        const m = state.memberships.find((x) => toMembershipDetail(x).id === id);
        if (!m) throw new Error("no such membership");
        if (patch.role !== undefined) m.role = patch.role;
        if (patch.status !== undefined) {
          // model the last-active-owner guard
          if (
            m.role === "owner" &&
            m.status === "active" &&
            patch.status !== "active" &&
            state.memberships.filter(
              (x) => x.memorialId === m.memorialId && x.role === "owner" && x.status === "active",
            ).length <= 1
          ) {
            throw new Error("cannot remove the only active owner");
          }
          m.status = patch.status;
        }
        if (patch.revokedAt !== undefined) m.revokedAt = patch.revokedAt;
        return toMembershipDetail(m);
      },
      async transferOwnership(
        memorialId: MemorialId,
        newOwnerProfileId: string,
      ): Promise<{ previousOwnerProfileId: string }> {
        const current = state.memberships.find(
          (x) => x.memorialId === memorialId && x.role === "owner" && x.status === "active",
        );
        const target = state.memberships.find(
          (x) => x.memorialId === memorialId && x.profileId === newOwnerProfileId,
        );
        if (!current || !current.profileId || !target)
          throw new Error("transfer preconditions unmet");
        current.role = "admin";
        target.role = "owner";
        target.status = "active";
        return { previousOwnerProfileId: current.profileId };
      },
    },
    slugs: {
      async findBySlug(slug: string): Promise<MemorialSlugRow | null> {
        return state.slugs.find((r) => r.slug === slug)
          ? { ...state.slugs.find((r) => r.slug === slug)! }
          : null;
      },
      async listForMemorial(memorialId: MemorialId): Promise<MemorialSlugRow[]> {
        return state.slugs.filter((r) => r.memorialId === memorialId).map((r) => ({ ...r }));
      },
      async canonicalFor(memorialId: MemorialId): Promise<MemorialSlugRow | null> {
        const r = state.slugs.find((s) => s.memorialId === memorialId && s.isCanonical);
        return r ? { ...r } : null;
      },
      async isReserved(slug: string): Promise<boolean> {
        return RESERVED.has(slug);
      },
      async addCanonical(input): Promise<MemorialSlugRow> {
        consumeFail("slug.addCanonical");
        if (state.slugs.some((r) => r.slug === input.slug)) {
          throw new UniqueViolation("memorial_slugs_slug_key");
        }
        const row: MemorialSlugRow = {
          id: input.id,
          memorialId: input.memorialId,
          slug: input.slug,
          isCanonical: true,
          redirectEnabled: true,
          retiredAt: null,
          createdAt: nowIso(),
        };
        state.slugs.push(row);
        return { ...row };
      },
      async retireCanonical(memorialId: MemorialId, retiredAt: Date): Promise<void> {
        for (const r of state.slugs) {
          if (r.memorialId === memorialId && r.isCanonical) {
            r.isCanonical = false;
            r.retiredAt = retiredAt.toISOString();
          }
        }
      },
      async promoteExistingToCanonical(slugRowId: string): Promise<MemorialSlugRow> {
        const r = state.slugs.find((s) => s.id === slugRowId);
        if (!r) throw new Error("no such slug row");
        r.isCanonical = true;
        r.retiredAt = null;
        return { ...r };
      },
    },
    settings: {
      async privacy(memorialId: MemorialId): Promise<PrivacySettingsRow | null> {
        const r = state.privacy.get(memorialId);
        return r ? { ...r } : null;
      },
      async feature(memorialId: MemorialId): Promise<FeatureSettingsRow | null> {
        const r = state.feature.get(memorialId);
        return r ? { ...r } : null;
      },
      async updatePrivacy(
        memorialId: MemorialId,
        patch: PrivacySettingsPatch,
      ): Promise<PrivacySettingsRow> {
        consumeFail("settings.updatePrivacy");
        const r = state.privacy.get(memorialId);
        if (!r) throw new Error("no such privacy row");
        if (patch.visibility !== undefined) r.visibility = patch.visibility;
        if (patch.searchIndexingEnabled !== undefined)
          r.searchIndexingEnabled = patch.searchIndexingEnabled;
        return { ...r };
      },
      async updateFeature(
        memorialId: MemorialId,
        patch: FeatureSettingsPatch,
      ): Promise<FeatureSettingsRow> {
        consumeFail("settings.updateFeature");
        const r = state.feature.get(memorialId);
        if (!r) throw new Error("no such feature row");
        for (const [k, v] of Object.entries(patch)) {
          if (v !== undefined) (r as unknown as Record<string, unknown>)[k] = v;
        }
        return { ...r };
      },
    },
    story: {
      async listForMemorial(memorialId: MemorialId): Promise<StorySectionRow[]> {
        return state.story
          .filter((s) => s.memorialId === memorialId && !s.deletedAt)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(stripStory);
      },
      async findById(id: string): Promise<StorySectionRow | null> {
        const r = state.story.find((s) => s.id === id && !s.deletedAt);
        return r ? stripStory(r) : null;
      },
      async create(input: NewStorySection): Promise<StorySectionRow> {
        consumeFail("story.create");
        const row: StoredStory = { ...input, deletedAt: null };
        state.story.push(row);
        return stripStory(row);
      },
      async update(id: string, patch: StorySectionPatch): Promise<StorySectionRow> {
        consumeFail("story.update");
        const r = state.story.find((s) => s.id === id && !s.deletedAt);
        if (!r) throw new Error("no such story section");
        for (const [k, v] of Object.entries(patch)) {
          if (v !== undefined) (r as unknown as Record<string, unknown>)[k] = v;
        }
        return stripStory(r);
      },
      async softDelete(id: string): Promise<void> {
        const r = state.story.find((s) => s.id === id);
        if (r) r.deletedAt = nowIso();
      },
      async setOrder(entries): Promise<void> {
        for (const { id, displayOrder } of entries) {
          const r = state.story.find((s) => s.id === id);
          if (r) r.displayOrder = displayOrder;
        }
      },
      async publishedCount(memorialId: MemorialId): Promise<number> {
        return state.story.filter(
          (s) => s.memorialId === memorialId && !s.deletedAt && s.status === "published",
        ).length;
      },
    },
    milestones: {
      async listForMemorial(memorialId: MemorialId): Promise<MilestoneRow[]> {
        return state.milestones
          .filter((m) => m.memorialId === memorialId && !m.deletedAt)
          .sort((a, b) => a.year - b.year || a.displayOrder - b.displayOrder)
          .map(stripMilestone);
      },
      async findById(id: string): Promise<MilestoneRow | null> {
        const r = state.milestones.find((m) => m.id === id && !m.deletedAt);
        return r ? stripMilestone(r) : null;
      },
      async create(input: NewMilestone): Promise<MilestoneRow> {
        consumeFail("milestone.create");
        const row: StoredMilestone = { ...input, deletedAt: null };
        state.milestones.push(row);
        return stripMilestone(row);
      },
      async update(id: string, patch: MilestonePatch): Promise<MilestoneRow> {
        consumeFail("milestone.update");
        const r = state.milestones.find((m) => m.id === id && !m.deletedAt);
        if (!r) throw new Error("no such milestone");
        for (const [k, v] of Object.entries(patch)) {
          if (v !== undefined) (r as unknown as Record<string, unknown>)[k] = v;
        }
        return stripMilestone(r);
      },
      async softDelete(id: string): Promise<void> {
        const r = state.milestones.find((m) => m.id === id);
        if (r) r.deletedAt = nowIso();
      },
      async setOrder(entries): Promise<void> {
        for (const { id, displayOrder } of entries) {
          const r = state.milestones.find((m) => m.id === id);
          if (r) r.displayOrder = displayOrder;
        }
      },
    },
    albums: {
      async listForMemorial(memorialId: MemorialId): Promise<AlbumRow[]> {
        return state.albums
          .filter((a) => a.memorialId === memorialId && !a.deletedAt)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(stripAlbum);
      },
      async findById(id: string): Promise<AlbumRow | null> {
        const r = state.albums.find((a) => a.id === id && !a.deletedAt);
        return r ? stripAlbum(r) : null;
      },
      async create(input: NewAlbum): Promise<AlbumRow> {
        consumeFail("album.create");
        const row: StoredAlbum = { ...input, coverMediaId: null, deletedAt: null };
        state.albums.push(row);
        return stripAlbum(row);
      },
      async update(id: string, patch: AlbumPatch): Promise<AlbumRow> {
        const r = state.albums.find((a) => a.id === id && !a.deletedAt);
        if (!r) throw new Error("no such album");
        for (const [k, v] of Object.entries(patch)) {
          if (v !== undefined) (r as unknown as Record<string, unknown>)[k] = v;
        }
        return stripAlbum(r);
      },
      async softDelete(id: string): Promise<void> {
        const r = state.albums.find((a) => a.id === id);
        if (r) r.deletedAt = nowIso();
      },
      async setOrder(entries): Promise<void> {
        for (const { id, displayOrder } of entries) {
          const r = state.albums.find((a) => a.id === id);
          if (r) r.displayOrder = displayOrder;
        }
      },
    },
    media: {
      async listForMemorial(memorialId: MemorialId): Promise<MediaRow[]> {
        return state.media
          .filter((m) => m.memorialId === memorialId && !m.deletedAt)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(stripMedia);
      },
      async findById(id: string): Promise<MediaRow | null> {
        const r = state.media.find((m) => m.id === id && !m.deletedAt);
        return r ? stripMedia(r) : null;
      },
      async create(input: NewMedia): Promise<MediaRow> {
        consumeFail("media.create");
        const { uploadedBy: _u, ...rest } = input;
        void _u;
        const row: StoredMedia = { ...rest, processingStatus: "ready", deletedAt: null };
        state.media.push(row);
        return stripMedia(row);
      },
      async update(id: string, patch: MediaPatch): Promise<MediaRow> {
        consumeFail("media.update");
        const r = state.media.find((m) => m.id === id && !m.deletedAt);
        if (!r) throw new Error("no such media");
        for (const [k, v] of Object.entries(patch)) {
          if (v !== undefined) (r as unknown as Record<string, unknown>)[k] = v;
        }
        return stripMedia(r);
      },
      async softDelete(id: string): Promise<void> {
        const r = state.media.find((m) => m.id === id);
        if (r) r.deletedAt = nowIso();
      },
      async setOrder(entries): Promise<void> {
        for (const { id, displayOrder } of entries) {
          const r = state.media.find((m) => m.id === id);
          if (r) r.displayOrder = displayOrder;
        }
      },
      async clearAlbum(albumId: string): Promise<void> {
        for (const m of state.media) if (m.albumId === albumId) m.albumId = null;
      },
      async readyCount(memorialId: MemorialId): Promise<number> {
        return state.media.filter(
          (m) => m.memorialId === memorialId && !m.deletedAt && m.processingStatus === "ready",
        ).length;
      },
    },
    tributes: {
      async findById(id: string): Promise<TributeRow | null> {
        const r = state.tributes.find((t) => t.id === id && !t.deletedAt);
        return r ? stripTribute(r) : null;
      },
      async create(input: NewTribute): Promise<TributeRow> {
        consumeFail("tribute.create");
        const row: StoredTribute = {
          id: input.id,
          memorialId: input.memorialId,
          status: input.status,
          authorDisplayName: input.authorDisplayName,
          authorRelationship: input.authorRelationship,
          message: input.message,
          mediaId: input.mediaId,
          editToken: input.editToken,
          moderatedBy: null,
          moderatedAt: null,
          moderationNote: null,
          publishedAt: input.publishedAt,
          createdAt: nowIso(),
          deletedAt: null,
          submittedIp: input.submittedIp,
        };
        state.tributes.push(row);
        return stripTribute(row);
      },
      async moderate(id: string, patch: TributeModerationPatch): Promise<TributeRow> {
        consumeFail("tribute.moderate");
        const r = state.tributes.find((t) => t.id === id && !t.deletedAt);
        if (!r) throw new Error("no such tribute");
        r.status = patch.status;
        r.moderatedBy = patch.moderatedBy;
        r.moderatedAt = patch.moderatedAt;
        if (patch.publishedAt !== undefined) r.publishedAt = patch.publishedAt;
        if (patch.moderationNote !== undefined) r.moderationNote = patch.moderationNote;
        return stripTribute(r);
      },
      async pendingCount(memorialId: MemorialId): Promise<number> {
        return state.tributes.filter(
          (t) =>
            t.memorialId === memorialId &&
            !t.deletedAt &&
            (t.status === "pending" || t.status === "reported"),
        ).length;
      },
      async recentFromIp(memorialId: MemorialId, ip: string, sinceIso: string): Promise<number> {
        return state.tributes.filter(
          (t) => t.memorialId === memorialId && t.submittedIp === ip && t.createdAt >= sinceIso,
        ).length;
      },
      async findByEditToken(token: string): Promise<TributeEditView | null> {
        const r = state.tributes.find((t) => t.editToken === token && !t.deletedAt);
        return r ? toTributeEditView(r) : null;
      },
      async editByToken(
        token: string,
        patch: {
          authorDisplayName: string;
          authorRelationship: string | null;
          message: string;
          status: Extract<TributeStatus, "pending" | "approved">;
        },
      ): Promise<TributeEditView | null> {
        const r = state.tributes.find((t) => t.editToken === token && !t.deletedAt);
        if (!r) return null;
        r.authorDisplayName = patch.authorDisplayName;
        r.authorRelationship = patch.authorRelationship;
        r.message = patch.message;
        r.status = patch.status;
        r.moderatedBy = null;
        r.moderatedAt = null;
        r.moderationNote = null;
        r.publishedAt = patch.status === "approved" ? nowIso() : null;
        return toTributeEditView(r);
      },
    },
    serviceRequests: {
      async create(input: NewServiceRequest): Promise<{ id: string }> {
        state.serviceRequests.push({ ...input, status: "new", createdAt: nowIso() });
        return { id: input.id };
      },
      async findById(id: string): Promise<ServiceRequestRow | null> {
        const r = state.serviceRequests.find((x) => x.id === id);
        return r ? toServiceRequestRow(r) : null;
      },
      async update(id: string, patch: ServiceRequestPatch): Promise<ServiceRequestRow> {
        const r = state.serviceRequests.find((x) => x.id === id);
        if (!r) throw new Error("no such service request");
        if (patch.status !== undefined) r.status = patch.status;
        if (patch.assignedTo !== undefined) r.assignedTo = patch.assignedTo;
        if (patch.internalNotes !== undefined) r.internalNotes = patch.internalNotes;
        return toServiceRequestRow(r);
      },
      async recentFromIp(ip: string, sinceIso: string): Promise<number> {
        return state.serviceRequests.filter(
          (r) => r.submittedIp === ip && (r.createdAt ?? "") >= sinceIso,
        ).length;
      },
    },
    reports: {
      async create(input: NewReport): Promise<{ id: string }> {
        consumeFail("report.create");
        state.reports.push({ ...input, status: "open", createdAt: nowIso() });
        return { id: input.id };
      },
      async findById(id: string): Promise<ReportRow | null> {
        const r = state.reports.find((x) => x.id === id);
        return r ? toReportRow(r) : null;
      },
      async resolve(id: string, patch: ReportResolution): Promise<ReportRow> {
        const r = state.reports.find((x) => x.id === id);
        if (!r) throw new Error("no such report");
        r.status = patch.status;
        r.resolvedBy = patch.resolvedBy;
        r.resolvedAt = patch.resolvedAt;
        r.resolutionNote = patch.resolutionNote;
        return toReportRow(r);
      },
      async recentFromIp(ip: string, sinceIso: string): Promise<number> {
        return state.reports.filter((r) => r.submittedIp === ip && (r.createdAt ?? "") >= sinceIso)
          .length;
      },
    },
    funeralEvents: {
      async listForMemorial(memorialId: MemorialId): Promise<FuneralEventRow[]> {
        return state.funeralEvents
          .filter((e) => e.memorialId === memorialId && !e.deletedAt)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(stripFuneral);
      },
      async findById(id: string): Promise<FuneralEventRow | null> {
        const r = state.funeralEvents.find((e) => e.id === id && !e.deletedAt);
        return r ? stripFuneral(r) : null;
      },
      async create(input: NewFuneralEvent): Promise<FuneralEventRow> {
        consumeFail("funeral_event.create");
        const row: StoredFuneralEvent = {
          id: input.id,
          memorialId: input.memorialId,
          eventType: input.eventType,
          status: "draft",
          title: input.title,
          description: input.description ?? null,
          eventDate: input.eventDate ?? null,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          timezone: input.timezone ?? null,
          venueName: input.venueName ?? null,
          addressLine: input.addressLine ?? null,
          city: input.city ?? null,
          region: input.region ?? null,
          country: input.country ?? null,
          postalCode: input.postalCode ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          dressCode: input.dressCode ?? null,
          contacts: input.contacts ?? [],
          livestreamUrl: input.livestreamUrl ?? null,
          instructions: input.instructions ?? null,
          visibility: input.visibility,
          displayOrder: input.displayOrder,
          publishedAt: null,
          cancelledAt: null,
          cancelReason: null,
          deletedAt: null,
        };
        state.funeralEvents.push(row);
        return stripFuneral(row);
      },
      async update(id: string, patch: FuneralEventPatch): Promise<FuneralEventRow> {
        consumeFail("funeral_event.update");
        const r = state.funeralEvents.find((e) => e.id === id && !e.deletedAt);
        if (!r) throw new Error("no such funeral event");
        for (const [k, v] of Object.entries(patch)) {
          if (v !== undefined) (r as unknown as Record<string, unknown>)[k] = v;
        }
        return stripFuneral(r);
      },
      async applyLifecycle(
        id: string,
        patch: FuneralEventLifecyclePatch,
      ): Promise<FuneralEventRow> {
        const r = state.funeralEvents.find((e) => e.id === id && !e.deletedAt);
        if (!r) throw new Error("no such funeral event");
        r.status = patch.status;
        if (patch.publishedAt !== undefined) r.publishedAt = patch.publishedAt;
        if (patch.cancelledAt !== undefined) r.cancelledAt = patch.cancelledAt;
        if (patch.cancelReason !== undefined) r.cancelReason = patch.cancelReason;
        return stripFuneral(r);
      },
      async softDelete(id: string): Promise<void> {
        const r = state.funeralEvents.find((e) => e.id === id);
        if (r) r.deletedAt = nowIso();
      },
      async setOrder(entries): Promise<void> {
        for (const { id, displayOrder } of entries) {
          const r = state.funeralEvents.find((e) => e.id === id);
          if (r) r.displayOrder = displayOrder;
        }
      },
      async publishedCount(memorialId: MemorialId): Promise<number> {
        return state.funeralEvents.filter(
          (e) => e.memorialId === memorialId && !e.deletedAt && e.status === "published",
        ).length;
      },
    },
    familyUpdates: {
      async listForMemorial(memorialId: MemorialId): Promise<FamilyUpdateRow[]> {
        return state.familyUpdates
          .filter((u) => u.memorialId === memorialId && !u.deletedAt)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .map(stripFamilyUpdate);
      },
      async findById(id: string): Promise<FamilyUpdateRow | null> {
        const r = state.familyUpdates.find((u) => u.id === id && !u.deletedAt);
        return r ? stripFamilyUpdate(r) : null;
      },
      async create(input: NewFamilyUpdate): Promise<FamilyUpdateRow> {
        consumeFail("family_update.create");
        const row: StoredFamilyUpdate = {
          id: input.id,
          memorialId: input.memorialId,
          title: input.title,
          body: input.body,
          importance: input.importance,
          authorProfileId: input.authorProfileId,
          funeralEventId: input.funeralEventId,
          status: "draft",
          visibility: input.visibility,
          publishedAt: null,
          createdAt: nowIso(),
          deletedAt: null,
        };
        state.familyUpdates.push(row);
        return stripFamilyUpdate(row);
      },
      async update(id: string, patch: FamilyUpdatePatch): Promise<FamilyUpdateRow> {
        consumeFail("family_update.update");
        const r = state.familyUpdates.find((u) => u.id === id && !u.deletedAt);
        if (!r) throw new Error("no such family update");
        for (const [k, v] of Object.entries(patch)) {
          if (v !== undefined) (r as unknown as Record<string, unknown>)[k] = v;
        }
        return stripFamilyUpdate(r);
      },
      async applyLifecycle(
        id: string,
        patch: FamilyUpdateLifecyclePatch,
      ): Promise<FamilyUpdateRow> {
        const r = state.familyUpdates.find((u) => u.id === id && !u.deletedAt);
        if (!r) throw new Error("no such family update");
        r.status = patch.status;
        if (patch.publishedAt !== undefined) r.publishedAt = patch.publishedAt;
        return stripFamilyUpdate(r);
      },
      async softDelete(id: string): Promise<void> {
        const r = state.familyUpdates.find((u) => u.id === id);
        if (r) r.deletedAt = nowIso();
      },
      async publishedCount(memorialId: MemorialId): Promise<number> {
        return state.familyUpdates.filter(
          (u) => u.memorialId === memorialId && !u.deletedAt && u.status === "published",
        ).length;
      },
    },
    shareResolvers: {
      async listForMemorial(memorialId: MemorialId): Promise<ShareResolverRow[]> {
        return state.shareResolvers
          .filter((r) => r.memorialId === memorialId)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .map((r) => ({ ...r }));
      },
      async findById(id: string): Promise<ShareResolverRow | null> {
        const r = state.shareResolvers.find((x) => x.id === id);
        return r ? { ...r } : null;
      },
      async create(input: NewShareResolver): Promise<ShareResolverRow> {
        const row: StoredShareResolver = {
          id: input.id,
          memorialId: input.memorialId,
          token: Array.from({ length: 18 }, () => Math.floor(Math.random() * 16).toString(16)).join(
            "",
          ),
          label: input.label,
          medium: input.medium,
          isActive: true,
          createdAt: nowIso(),
          retiredAt: null,
        };
        state.shareResolvers.push(row);
        return { ...row };
      },
      async retire(id: string): Promise<ShareResolverRow> {
        const r = state.shareResolvers.find((x) => x.id === id);
        if (!r) throw new Error("no such share resolver");
        r.isActive = false;
        r.retiredAt = nowIso();
        return { ...r };
      },
    },
    notifications: {
      async recordMany(entries: NewNotification[]): Promise<void> {
        for (const e of entries) {
          state.notifications.push({
            id: e.id,
            recipientProfileId: e.recipientProfileId,
            recipientEmail: e.recipientEmail,
            memorialId: e.memorialId,
            eventType: e.eventType,
            channel: e.channel,
            payload: e.payload,
            readAt: null,
            createdAt: nowIso(),
          });
        }
      },
      async memorialRecipientIds(memorialId: string): Promise<string[]> {
        return state.memberships
          .filter((m) => m.memorialId === memorialId && m.status === "active" && m.profileId)
          .map((m) => m.profileId as string);
      },
      async listForRecipient(profileId, opts): Promise<NotificationRow[]> {
        return state.notifications
          .filter(
            (n) =>
              n.recipientProfileId === profileId &&
              n.channel === "in_app" &&
              (!opts?.unreadOnly || n.readAt === null),
          )
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .slice(0, opts?.limit ?? 30)
          .map((n) => ({
            id: n.id,
            memorialId: n.memorialId,
            eventType: n.eventType,
            channel: n.channel,
            payload: n.payload,
            readAt: n.readAt,
            createdAt: n.createdAt,
          }));
      },
      async unreadCount(profileId): Promise<number> {
        return state.notifications.filter(
          (n) => n.recipientProfileId === profileId && n.channel === "in_app" && n.readAt === null,
        ).length;
      },
      async markRead(ids, profileId): Promise<void> {
        for (const n of state.notifications) {
          if (ids.includes(n.id) && n.recipientProfileId === profileId) n.readAt = nowIso();
        }
      },
      async markAllRead(profileId): Promise<void> {
        for (const n of state.notifications) {
          if (n.recipientProfileId === profileId && n.readAt === null) n.readAt = nowIso();
        }
      },
    },
    profiles: {
      async platformAdminIds(): Promise<string[]> {
        return state.platformAdminIds ?? [];
      },
    },
    audit: {
      async record(entry: AuditEntry): Promise<void> {
        consumeFail("audit.record");
        state.audit.push({ ...entry });
      },
    },
  };
}
