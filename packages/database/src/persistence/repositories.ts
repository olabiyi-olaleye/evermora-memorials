import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type {
  AlbumPatch,
  AlbumRepository,
  AlbumRow,
  AuditEntry,
  AuditRepository,
  FamilyUpdateLifecyclePatch,
  FamilyUpdatePatch,
  FamilyUpdateRepository,
  FamilyUpdateRow,
  FeatureSettingsPatch,
  FeatureSettingsRow,
  FuneralEventLifecyclePatch,
  FuneralEventPatch,
  FuneralEventRepository,
  FuneralEventRow,
  MediaKind,
  MediaPatch,
  MediaProcessingStatus,
  MediaRepository,
  MediaRow,
  MembershipDetailRow,
  MembershipPatch,
  MembershipRepository,
  NewMembershipInvite,
  MembershipRow,
  MemorialProfilePatch,
  MemorialStatusPatch,
  MemorialRepository,
  MemorialRow,
  MemorialSlugRepository,
  MemorialSlugRow,
  MilestonePatch,
  MilestoneRepository,
  MilestoneRow,
  NewAlbum,
  NewFamilyUpdate,
  NewFuneralEvent,
  NewMedia,
  NewShareResolver,
  NewMemorial,
  NewNotification,
  NewMilestone,
  NewReport,
  NewServiceRequest,
  NewStorySection,
  NotificationRepository,
  NotificationRow,
  ProfileRepository,
  NewTribute,
  PrivacySettingsPatch,
  PrivacySettingsRow,
  ReportRepository,
  ReportResolution,
  ReportRow,
  ServiceRequestRepository,
  ServiceRequestPatch,
  ServiceRequestRow,
  Repositories,
  SettingsRepository,
  ShareResolverRepository,
  ShareResolverRow,
  StoryRepository,
  StorySectionPatch,
  StorySectionRow,
  TributeEditView,
  TributeModerationPatch,
  TributeRepository,
  TributeRow,
} from "@evermora/domain";
import type {
  FuneralEventStatus,
  FuneralEventType,
  FuneralPlanningStatus,
  MemorialId,
  MemorialRole,
  ProfileId,
  PublicationStatus,
  ReportReason,
  SectionVisibility,
  StorySectionKind,
  TributeStatus,
  UpdateImportance,
} from "@evermora/types";
import {
  albums,
  auditLogs,
  familyUpdates,
  featureSettings,
  funeralEvents,
  media,
  shareResolvers,
  memorialMemberships,
  memorialSlugs,
  memorials,
  milestones,
  privacySettings,
  reports,
  serviceRequests,
  notifications,
  profiles,
  reservedSlugs,
  storySections,
  tributes,
} from "../schema/tables";
import { translatePgError } from "./pg-errors";
import type { RlsContext } from "./rls-context";

// A drizzle transaction handle — the subset we use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- drizzle's tx type is deep; the calls below are type-checked
type Tx = any;

/**
 * IMPORTANT — RLS + RETURNING: an `INSERT`/`UPDATE ... RETURNING` under Row
 * Level Security requires the affected row to also satisfy the table's SELECT
 * policy, and that check runs BEFORE the memorial's AFTER-INSERT
 * owner-membership trigger. So a freshly-inserted draft memorial is not yet
 * SELECT-visible → `RETURNING` fails. Every mutation here therefore mutates
 * WITHOUT `RETURNING` and then reads the row back with a separate `SELECT`
 * (by which point the trigger has run and the caller is a member).
 */

function toMemorialRow(r: typeof memorials.$inferSelect): MemorialRow {
  return {
    id: r.id as MemorialId,
    status: r.status,
    funeralPlanningStatus: r.funeralPlanningStatus,
    createdBy: (r.createdBy as ProfileId | null) ?? null,
    fullName: r.fullName,
    preferredName: r.preferredName ?? null,
    headline: r.headline ?? null,
    survivedBy: r.survivedBy ?? null,
    gender: r.gender ?? null,
    biographySummary: r.biographySummary ?? null,
    dateOfBirth: r.dateOfBirth ?? null,
    birthYearOnly: r.birthYearOnly,
    dateOfDeath: r.dateOfDeath ?? null,
    birthPlace: r.birthPlace ?? null,
    restingPlace: r.restingPlace ?? null,
    portraitMediaId: (r.portraitMediaId as string | null) ?? null,
    coverMediaId: (r.coverMediaId as string | null) ?? null,
    publishedAt: r.publishedAt ?? null,
    archivedAt: r.archivedAt ?? null,
    suspendedAt: r.suspendedAt ?? null,
    deletedAt: r.deletedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function toSlugRow(r: typeof memorialSlugs.$inferSelect): MemorialSlugRow {
  return {
    id: r.id,
    memorialId: r.memorialId as MemorialId,
    slug: r.slug,
    isCanonical: r.isCanonical,
    redirectEnabled: r.redirectEnabled,
    retiredAt: r.retiredAt ?? null,
    createdAt: r.createdAt,
  };
}

class DrizzleMemorialRepository implements MemorialRepository {
  constructor(private readonly tx: Tx) {}

  async create(input: NewMemorial): Promise<MemorialRow> {
    try {
      await this.tx.insert(memorials).values({
        id: input.id,
        status: input.status,
        createdBy: input.createdBy,
        fullName: input.fullName,
        preferredName: input.preferredName ?? null,
        headline: input.headline ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
        dateOfDeath: input.dateOfDeath ?? null,
        birthPlace: input.birthPlace ?? null,
      });
    } catch (err) {
      translatePgError(err);
    }
    const row = await this.requireById(input.id as MemorialId);
    return row;
  }

  async findById(id: MemorialId): Promise<MemorialRow | null> {
    const [row] = await this.tx.select().from(memorials).where(eq(memorials.id, id)).limit(1);
    return row ? toMemorialRow(row) : null;
  }

  async markPublished(id: MemorialId, publishedAt: Date): Promise<MemorialRow> {
    await this.tx
      .update(memorials)
      .set({ status: "published", publishedAt: publishedAt.toISOString() })
      .where(eq(memorials.id, id));
    return this.requireById(id);
  }

  async updateProfile(id: MemorialId, patch: MemorialProfilePatch): Promise<MemorialRow> {
    const set: Record<string, unknown> = {};
    if (patch.fullName !== undefined) set.fullName = patch.fullName;
    if (patch.preferredName !== undefined) set.preferredName = patch.preferredName;
    if (patch.headline !== undefined) set.headline = patch.headline;
    if (patch.survivedBy !== undefined) set.survivedBy = patch.survivedBy;
    if (patch.gender !== undefined) set.gender = patch.gender;
    if (patch.biographySummary !== undefined) set.biographySummary = patch.biographySummary;
    if (patch.dateOfBirth !== undefined) set.dateOfBirth = patch.dateOfBirth;
    if (patch.birthYearOnly !== undefined) set.birthYearOnly = patch.birthYearOnly;
    if (patch.dateOfDeath !== undefined) set.dateOfDeath = patch.dateOfDeath;
    if (patch.birthPlace !== undefined) set.birthPlace = patch.birthPlace;
    if (patch.restingPlace !== undefined) set.restingPlace = patch.restingPlace;
    if (Object.keys(set).length === 0) return this.requireById(id);
    try {
      await this.tx.update(memorials).set(set).where(eq(memorials.id, id));
    } catch (err) {
      translatePgError(err);
    }
    return this.requireById(id);
  }

  async setPortrait(id: MemorialId, mediaId: string | null): Promise<MemorialRow> {
    try {
      await this.tx.update(memorials).set({ portraitMediaId: mediaId }).where(eq(memorials.id, id));
    } catch (err) {
      translatePgError(err);
    }
    return this.requireById(id);
  }

  async setCover(id: MemorialId, mediaId: string | null): Promise<MemorialRow> {
    try {
      await this.tx.update(memorials).set({ coverMediaId: mediaId }).where(eq(memorials.id, id));
    } catch (err) {
      translatePgError(err);
    }
    return this.requireById(id);
  }

  async setFuneralPlanningStatus(
    id: MemorialId,
    status: FuneralPlanningStatus,
  ): Promise<MemorialRow> {
    try {
      await this.tx
        .update(memorials)
        .set({ funeralPlanningStatus: status })
        .where(eq(memorials.id, id));
    } catch (err) {
      translatePgError(err);
    }
    return this.requireById(id);
  }

  async setStatus(id: MemorialId, patch: MemorialStatusPatch): Promise<MemorialRow> {
    const set: Record<string, unknown> = { status: patch.status };
    if (patch.suspendedAt !== undefined) set.suspendedAt = patch.suspendedAt;
    if (patch.suspendedReason !== undefined) set.suspendedReason = patch.suspendedReason;
    try {
      await this.tx.update(memorials).set(set).where(eq(memorials.id, id));
    } catch (err) {
      translatePgError(err);
    }
    return this.requireById(id);
  }

  private async requireById(id: MemorialId): Promise<MemorialRow> {
    const row = await this.findById(id);
    if (!row) {
      throw new Error(`memorial ${id} not readable immediately after write (unexpected RLS state)`);
    }
    return row;
  }
}

class DrizzleMembershipRepository implements MembershipRepository {
  constructor(private readonly tx: Tx) {}

  async activeRole(memorialId: MemorialId, profileId: ProfileId): Promise<MemorialRole | null> {
    const [row] = await this.tx
      .select({ role: memorialMemberships.role })
      .from(memorialMemberships)
      .where(
        and(
          eq(memorialMemberships.memorialId, memorialId),
          eq(memorialMemberships.profileId, profileId),
          eq(memorialMemberships.status, "active"),
        ),
      )
      .limit(1);
    return (row?.role as MemorialRole | undefined) ?? null;
  }

  async activeFor(memorialId: MemorialId): Promise<MembershipRow[]> {
    const rows: (typeof memorialMemberships.$inferSelect)[] = await this.tx
      .select()
      .from(memorialMemberships)
      .where(
        and(
          eq(memorialMemberships.memorialId, memorialId),
          eq(memorialMemberships.status, "active"),
        ),
      );
    return rows
      .filter((r) => r.profileId !== null)
      .map((r) => ({
        memorialId: r.memorialId as MemorialId,
        profileId: r.profileId as ProfileId,
        role: r.role,
        status: r.status,
      }));
  }

  async listForMemorial(memorialId: MemorialId): Promise<MembershipDetailRow[]> {
    const rows: (typeof memorialMemberships.$inferSelect)[] = await this.tx
      .select()
      .from(memorialMemberships)
      .where(eq(memorialMemberships.memorialId, memorialId))
      .orderBy(sql`${memorialMemberships.invitedAt} desc`);
    return rows.map(toMembershipDetailRow);
  }

  async detailById(id: string): Promise<MembershipDetailRow | null> {
    const [row] = await this.tx
      .select()
      .from(memorialMemberships)
      .where(eq(memorialMemberships.id, id))
      .limit(1);
    return row ? toMembershipDetailRow(row) : null;
  }

  async pendingInviteFor(
    memorialId: MemorialId,
    email: string,
  ): Promise<MembershipDetailRow | null> {
    const [row] = await this.tx
      .select()
      .from(memorialMemberships)
      .where(
        and(
          eq(memorialMemberships.memorialId, memorialId),
          eq(memorialMemberships.status, "invited"),
          sql`lower(${memorialMemberships.invitedEmail}) = ${email.toLowerCase()}`,
        ),
      )
      .limit(1);
    return row ? toMembershipDetailRow(row) : null;
  }

  async activeForProfile(
    memorialId: MemorialId,
    profileId: string,
  ): Promise<MembershipDetailRow | null> {
    const [row] = await this.tx
      .select()
      .from(memorialMemberships)
      .where(
        and(
          eq(memorialMemberships.memorialId, memorialId),
          eq(memorialMemberships.profileId, profileId),
          eq(memorialMemberships.status, "active"),
        ),
      )
      .limit(1);
    return row ? toMembershipDetailRow(row) : null;
  }

  async createInvite(input: NewMembershipInvite): Promise<MembershipDetailRow> {
    try {
      await this.tx.insert(memorialMemberships).values({
        id: input.id,
        memorialId: input.memorialId,
        profileId: input.profileId,
        invitedEmail: input.invitedEmail,
        role: input.role,
        status: "invited",
        invitedBy: input.invitedBy,
        invitedAt: new Date().toISOString(),
      });
    } catch (err) {
      translatePgError(err);
    }
    return this.requireDetail(input.id);
  }

  async applyPatch(id: string, patch: MembershipPatch): Promise<MembershipDetailRow> {
    const set: Record<string, unknown> = {};
    if (patch.role !== undefined) set.role = patch.role;
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.revokedAt !== undefined) set.revokedAt = patch.revokedAt;
    if (patch.status === "active")
      set.acceptedAt = sql`coalesce(${memorialMemberships.acceptedAt}, now())`;
    if (Object.keys(set).length > 0) {
      try {
        await this.tx.update(memorialMemberships).set(set).where(eq(memorialMemberships.id, id));
      } catch (err) {
        translatePgError(err);
      }
    }
    return this.requireDetail(id);
  }

  async transferOwnership(
    memorialId: MemorialId,
    newOwnerProfileId: string,
  ): Promise<{ previousOwnerProfileId: string }> {
    // The `memberships_guard_owner` trigger + one-active-owner index only allow
    // a transfer through this SECURITY DEFINER function, which runs in the same
    // RLS-scoped transaction (it re-checks the caller is the current owner).
    let rows: unknown[];
    try {
      rows = await this.tx.execute(
        sql`select previous_owner from public.transfer_memorial_ownership(${memorialId}::uuid, ${newOwnerProfileId}::uuid)`,
      );
    } catch (err) {
      translatePgError(err);
      throw err;
    }
    const first = rows[0] as { previous_owner?: string } | undefined;
    if (!first?.previous_owner) throw new Error("ownership transfer returned no row");
    return { previousOwnerProfileId: first.previous_owner };
  }

  private async requireDetail(id: string): Promise<MembershipDetailRow> {
    const row = await this.detailById(id);
    if (!row) throw new Error(`membership ${id} not readable after write (unexpected RLS state)`);
    return row;
  }
}

function toMembershipDetailRow(r: typeof memorialMemberships.$inferSelect): MembershipDetailRow {
  return {
    id: r.id,
    memorialId: r.memorialId as MemorialId,
    profileId: r.profileId ?? null,
    invitedEmail: r.invitedEmail ?? null,
    role: r.role,
    status: r.status as MembershipDetailRow["status"],
    invitedBy: r.invitedBy ?? null,
    invitedAt: r.invitedAt,
    acceptedAt: r.acceptedAt ?? null,
    revokedAt: r.revokedAt ?? null,
  };
}

class DrizzleMemorialSlugRepository implements MemorialSlugRepository {
  constructor(private readonly tx: Tx) {}

  async findBySlug(slug: string): Promise<MemorialSlugRow | null> {
    const [row] = await this.tx
      .select()
      .from(memorialSlugs)
      .where(sql`${memorialSlugs.slug} = ${slug}`)
      .limit(1);
    return row ? toSlugRow(row) : null;
  }

  async listForMemorial(memorialId: MemorialId): Promise<MemorialSlugRow[]> {
    const rows: (typeof memorialSlugs.$inferSelect)[] = await this.tx
      .select()
      .from(memorialSlugs)
      .where(eq(memorialSlugs.memorialId, memorialId));
    return rows.map(toSlugRow);
  }

  async canonicalFor(memorialId: MemorialId): Promise<MemorialSlugRow | null> {
    const [row] = await this.tx
      .select()
      .from(memorialSlugs)
      .where(and(eq(memorialSlugs.memorialId, memorialId), eq(memorialSlugs.isCanonical, true)))
      .limit(1);
    return row ? toSlugRow(row) : null;
  }

  async isReserved(slug: string): Promise<boolean> {
    const [row] = await this.tx
      .select({ slug: reservedSlugs.slug })
      .from(reservedSlugs)
      .where(sql`${reservedSlugs.slug} = ${slug}`)
      .limit(1);
    return Boolean(row);
  }

  async addCanonical(input: {
    id: string;
    memorialId: MemorialId;
    slug: string;
    createdBy: ProfileId;
  }): Promise<MemorialSlugRow> {
    try {
      await this.tx.insert(memorialSlugs).values({
        id: input.id,
        memorialId: input.memorialId,
        slug: input.slug,
        isCanonical: true,
        redirectEnabled: true,
        createdBy: input.createdBy,
      });
    } catch (err) {
      translatePgError(err);
    }
    return this.requireById(input.id);
  }

  async retireCanonical(memorialId: MemorialId, retiredAt: Date): Promise<void> {
    await this.tx
      .update(memorialSlugs)
      .set({ isCanonical: false, retiredAt: retiredAt.toISOString() })
      .where(and(eq(memorialSlugs.memorialId, memorialId), eq(memorialSlugs.isCanonical, true)));
  }

  async promoteExistingToCanonical(slugRowId: string): Promise<MemorialSlugRow> {
    try {
      await this.tx
        .update(memorialSlugs)
        .set({ isCanonical: true, retiredAt: null })
        .where(eq(memorialSlugs.id, slugRowId));
    } catch (err) {
      translatePgError(err);
    }
    return this.requireById(slugRowId);
  }

  private async requireById(id: string): Promise<MemorialSlugRow> {
    const [row] = await this.tx
      .select()
      .from(memorialSlugs)
      .where(eq(memorialSlugs.id, id))
      .limit(1);
    if (!row) throw new Error(`slug row ${id} not readable after write (unexpected RLS state)`);
    return toSlugRow(row);
  }
}

class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private readonly tx: Tx) {}

  async privacy(memorialId: MemorialId): Promise<PrivacySettingsRow | null> {
    const [row] = await this.tx
      .select()
      .from(privacySettings)
      .where(eq(privacySettings.memorialId, memorialId))
      .limit(1);
    return row
      ? {
          memorialId: row.memorialId as MemorialId,
          visibility: row.visibility,
          searchIndexingEnabled: row.searchIndexingEnabled,
        }
      : null;
  }

  async feature(memorialId: MemorialId): Promise<FeatureSettingsRow | null> {
    const [row] = await this.tx
      .select()
      .from(featureSettings)
      .where(eq(featureSettings.memorialId, memorialId))
      .limit(1);
    if (!row) return null;
    return toFeatureRow(row);
  }

  async updatePrivacy(
    memorialId: MemorialId,
    patch: PrivacySettingsPatch,
  ): Promise<PrivacySettingsRow> {
    const set: Record<string, unknown> = {};
    if (patch.visibility !== undefined) set.visibility = patch.visibility;
    if (patch.searchIndexingEnabled !== undefined)
      set.searchIndexingEnabled = patch.searchIndexingEnabled;
    if (Object.keys(set).length > 0) {
      try {
        await this.tx
          .update(privacySettings)
          .set(set)
          .where(eq(privacySettings.memorialId, memorialId));
      } catch (err) {
        translatePgError(err);
      }
    }
    const row = await this.privacy(memorialId);
    if (!row) {
      throw new Error(
        `privacy_settings for ${memorialId} not readable after write (unexpected RLS state)`,
      );
    }
    return row;
  }

  async updateFeature(
    memorialId: MemorialId,
    patch: FeatureSettingsPatch,
  ): Promise<FeatureSettingsRow> {
    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) set[k] = v;
    }
    if (Object.keys(set).length > 0) {
      try {
        await this.tx
          .update(featureSettings)
          .set(set)
          .where(eq(featureSettings.memorialId, memorialId));
      } catch (err) {
        translatePgError(err);
      }
    }
    const row = await this.feature(memorialId);
    if (!row) {
      throw new Error(
        `feature_settings for ${memorialId} not readable after write (unexpected RLS state)`,
      );
    }
    return row;
  }
}

function toFeatureRow(row: typeof featureSettings.$inferSelect): FeatureSettingsRow {
  return {
    memorialId: row.memorialId as MemorialId,
    tributesEnabled: row.tributesEnabled,
    tributeModerationEnabled: row.tributeModerationEnabled,
    photoContributionsEnabled: row.photoContributionsEnabled,
    candlesEnabled: row.candlesEnabled,
    funeralEnabled: row.funeralEnabled,
    familySectionEnabled: row.familySectionEnabled,
    updatesEnabled: row.updatesEnabled,
    guestbookEnabled: row.guestbookEnabled,
    sharingEnabled: row.sharingEnabled,
    qrCodeEnabled: row.qrCodeEnabled,
    visitorAnalyticsEnabled: row.visitorAnalyticsEnabled,
  };
}

function toStoryRow(r: typeof storySections.$inferSelect): StorySectionRow {
  return {
    id: r.id,
    memorialId: r.memorialId as MemorialId,
    kind: r.kind as StorySectionKind,
    title: r.title,
    body: r.body,
    visibility: r.visibility as SectionVisibility,
    status: r.status as PublicationStatus,
    displayOrder: r.displayOrder,
  };
}

class DrizzleStoryRepository implements StoryRepository {
  constructor(private readonly tx: Tx) {}

  async listForMemorial(memorialId: MemorialId): Promise<StorySectionRow[]> {
    const rows: (typeof storySections.$inferSelect)[] = await this.tx
      .select()
      .from(storySections)
      .where(and(eq(storySections.memorialId, memorialId), isNull(storySections.deletedAt)))
      .orderBy(asc(storySections.displayOrder));
    return rows.map(toStoryRow);
  }

  async findById(id: string): Promise<StorySectionRow | null> {
    const [row] = await this.tx
      .select()
      .from(storySections)
      .where(and(eq(storySections.id, id), isNull(storySections.deletedAt)))
      .limit(1);
    return row ? toStoryRow(row) : null;
  }

  async create(input: NewStorySection): Promise<StorySectionRow> {
    try {
      await this.tx.insert(storySections).values({
        id: input.id,
        memorialId: input.memorialId,
        kind: input.kind,
        title: input.title,
        body: input.body,
        visibility: input.visibility,
        status: input.status,
        displayOrder: input.displayOrder,
      });
    } catch (err) {
      translatePgError(err);
    }
    return this.require(input.id);
  }

  async update(id: string, patch: StorySectionPatch): Promise<StorySectionRow> {
    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
    if (Object.keys(set).length > 0) {
      try {
        await this.tx.update(storySections).set(set).where(eq(storySections.id, id));
      } catch (err) {
        translatePgError(err);
      }
    }
    return this.require(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.tx
      .update(storySections)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(storySections.id, id));
  }

  async setOrder(entries: { id: string; displayOrder: number }[]): Promise<void> {
    for (const { id, displayOrder } of entries) {
      await this.tx.update(storySections).set({ displayOrder }).where(eq(storySections.id, id));
    }
  }

  async publishedCount(memorialId: MemorialId): Promise<number> {
    const [row] = await this.tx
      .select({ n: sql<number>`count(*)::int` })
      .from(storySections)
      .where(
        and(
          eq(storySections.memorialId, memorialId),
          isNull(storySections.deletedAt),
          eq(storySections.status, "published"),
        ),
      );
    return row?.n ?? 0;
  }

  private async require(id: string): Promise<StorySectionRow> {
    const row = await this.findById(id);
    if (!row)
      throw new Error(`story section ${id} not readable after write (unexpected RLS state)`);
    return row;
  }
}

function toMilestoneRow(r: typeof milestones.$inferSelect): MilestoneRow {
  return {
    id: r.id,
    memorialId: r.memorialId as MemorialId,
    year: r.year,
    onDate: r.onDate ?? null,
    title: r.title,
    description: r.description ?? null,
    visibility: r.visibility as SectionVisibility,
    status: r.status as PublicationStatus,
    displayOrder: r.displayOrder,
  };
}

class DrizzleMilestoneRepository implements MilestoneRepository {
  constructor(private readonly tx: Tx) {}

  async listForMemorial(memorialId: MemorialId): Promise<MilestoneRow[]> {
    const rows: (typeof milestones.$inferSelect)[] = await this.tx
      .select()
      .from(milestones)
      .where(and(eq(milestones.memorialId, memorialId), isNull(milestones.deletedAt)))
      .orderBy(asc(milestones.year), asc(milestones.displayOrder));
    return rows.map(toMilestoneRow);
  }

  async findById(id: string): Promise<MilestoneRow | null> {
    const [row] = await this.tx
      .select()
      .from(milestones)
      .where(and(eq(milestones.id, id), isNull(milestones.deletedAt)))
      .limit(1);
    return row ? toMilestoneRow(row) : null;
  }

  async create(input: NewMilestone): Promise<MilestoneRow> {
    try {
      await this.tx.insert(milestones).values({
        id: input.id,
        memorialId: input.memorialId,
        year: input.year,
        onDate: input.onDate,
        title: input.title,
        description: input.description,
        visibility: input.visibility,
        status: input.status,
        displayOrder: input.displayOrder,
      });
    } catch (err) {
      translatePgError(err);
    }
    return this.require(input.id);
  }

  async update(id: string, patch: MilestonePatch): Promise<MilestoneRow> {
    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
    if (Object.keys(set).length > 0) {
      try {
        await this.tx.update(milestones).set(set).where(eq(milestones.id, id));
      } catch (err) {
        translatePgError(err);
      }
    }
    return this.require(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.tx
      .update(milestones)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(milestones.id, id));
  }

  async setOrder(entries: { id: string; displayOrder: number }[]): Promise<void> {
    for (const { id, displayOrder } of entries) {
      await this.tx.update(milestones).set({ displayOrder }).where(eq(milestones.id, id));
    }
  }

  private async require(id: string): Promise<MilestoneRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`milestone ${id} not readable after write (unexpected RLS state)`);
    return row;
  }
}

function toAlbumRow(r: typeof albums.$inferSelect): AlbumRow {
  return {
    id: r.id,
    memorialId: r.memorialId as MemorialId,
    title: r.title,
    description: r.description ?? null,
    coverMediaId: (r.coverMediaId as string | null) ?? null,
    visibility: r.visibility as SectionVisibility,
    status: r.status as PublicationStatus,
    displayOrder: r.displayOrder,
  };
}

class DrizzleAlbumRepository implements AlbumRepository {
  constructor(private readonly tx: Tx) {}

  async listForMemorial(memorialId: MemorialId): Promise<AlbumRow[]> {
    const rows: (typeof albums.$inferSelect)[] = await this.tx
      .select()
      .from(albums)
      .where(and(eq(albums.memorialId, memorialId), isNull(albums.deletedAt)))
      .orderBy(asc(albums.displayOrder));
    return rows.map(toAlbumRow);
  }

  async findById(id: string): Promise<AlbumRow | null> {
    const [row] = await this.tx
      .select()
      .from(albums)
      .where(and(eq(albums.id, id), isNull(albums.deletedAt)))
      .limit(1);
    return row ? toAlbumRow(row) : null;
  }

  async create(input: NewAlbum): Promise<AlbumRow> {
    try {
      await this.tx.insert(albums).values({
        id: input.id,
        memorialId: input.memorialId,
        title: input.title,
        description: input.description,
        visibility: input.visibility,
        status: input.status,
        displayOrder: input.displayOrder,
      });
    } catch (err) {
      translatePgError(err);
    }
    return this.require(input.id);
  }

  async update(id: string, patch: AlbumPatch): Promise<AlbumRow> {
    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
    if (Object.keys(set).length > 0) {
      try {
        await this.tx.update(albums).set(set).where(eq(albums.id, id));
      } catch (err) {
        translatePgError(err);
      }
    }
    return this.require(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.tx
      .update(albums)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(albums.id, id));
  }

  async setOrder(entries: { id: string; displayOrder: number }[]): Promise<void> {
    for (const { id, displayOrder } of entries) {
      await this.tx.update(albums).set({ displayOrder }).where(eq(albums.id, id));
    }
  }

  private async require(id: string): Promise<AlbumRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`album ${id} not readable after write (unexpected RLS state)`);
    return row;
  }
}

function toMediaRow(r: typeof media.$inferSelect): MediaRow {
  return {
    id: r.id,
    memorialId: r.memorialId as MemorialId,
    albumId: (r.albumId as string | null) ?? null,
    storageBucket: r.storageBucket,
    storagePath: r.storagePath,
    kind: r.kind as MediaKind,
    mimeType: r.mimeType ?? null,
    byteSize: r.byteSize ?? null,
    width: r.width ?? null,
    height: r.height ?? null,
    checksum: r.checksum ?? null,
    caption: r.caption ?? null,
    altText: r.altText ?? null,
    visibility: r.visibility as SectionVisibility,
    processingStatus: r.processingStatus as MediaProcessingStatus,
    displayOrder: r.displayOrder,
  };
}

class DrizzleMediaRepository implements MediaRepository {
  constructor(private readonly tx: Tx) {}

  async listForMemorial(memorialId: MemorialId): Promise<MediaRow[]> {
    const rows: (typeof media.$inferSelect)[] = await this.tx
      .select()
      .from(media)
      .where(and(eq(media.memorialId, memorialId), isNull(media.deletedAt)))
      .orderBy(asc(media.displayOrder));
    return rows.map(toMediaRow);
  }

  async findById(id: string): Promise<MediaRow | null> {
    const [row] = await this.tx
      .select()
      .from(media)
      .where(and(eq(media.id, id), isNull(media.deletedAt)))
      .limit(1);
    return row ? toMediaRow(row) : null;
  }

  async create(input: NewMedia): Promise<MediaRow> {
    try {
      await this.tx.insert(media).values({
        id: input.id,
        memorialId: input.memorialId,
        albumId: input.albumId,
        storageBucket: input.storageBucket,
        storagePath: input.storagePath,
        kind: input.kind,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        width: input.width,
        height: input.height,
        checksum: input.checksum,
        caption: input.caption,
        altText: input.altText,
        source: "family",
        visibility: input.visibility,
        processingStatus: "ready",
        displayOrder: input.displayOrder,
        uploadedBy: input.uploadedBy,
      });
    } catch (err) {
      translatePgError(err);
    }
    return this.require(input.id);
  }

  async update(id: string, patch: MediaPatch): Promise<MediaRow> {
    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
    if (Object.keys(set).length > 0) {
      try {
        await this.tx.update(media).set(set).where(eq(media.id, id));
      } catch (err) {
        translatePgError(err);
      }
    }
    return this.require(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.tx
      .update(media)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(media.id, id));
  }

  async setOrder(entries: { id: string; displayOrder: number }[]): Promise<void> {
    for (const { id, displayOrder } of entries) {
      await this.tx.update(media).set({ displayOrder }).where(eq(media.id, id));
    }
  }

  async clearAlbum(albumId: string): Promise<void> {
    await this.tx.update(media).set({ albumId: null }).where(eq(media.albumId, albumId));
  }

  async readyCount(memorialId: MemorialId): Promise<number> {
    const [row] = await this.tx
      .select({ n: sql<number>`count(*)::int` })
      .from(media)
      .where(
        and(
          eq(media.memorialId, memorialId),
          isNull(media.deletedAt),
          eq(media.processingStatus, "ready"),
        ),
      );
    return row?.n ?? 0;
  }

  private async require(id: string): Promise<MediaRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`media ${id} not readable after write (unexpected RLS state)`);
    return row;
  }
}

function toTributeRow(r: typeof tributes.$inferSelect): TributeRow {
  return {
    id: r.id,
    memorialId: r.memorialId as MemorialId,
    status: r.status as TributeStatus,
    authorDisplayName: r.authorDisplayName,
    authorRelationship: r.authorRelationship ?? null,
    message: r.message,
    mediaId: (r.mediaId as string | null) ?? null,
    editToken: r.editToken,
    moderatedBy: (r.moderatedBy as ProfileId | null) ?? null,
    moderatedAt: r.moderatedAt ?? null,
    moderationNote: r.moderationNote ?? null,
    publishedAt: r.publishedAt ?? null,
    createdAt: r.createdAt,
  };
}

/** Row shape returned by `resolve_tribute_edit_token` / `apply_tribute_edit` (raw snake_case from `tx.execute`). */
interface TributeEditRpcRow {
  id: string;
  memorial_id: string;
  status: string;
  author_display_name: string;
  author_relationship: string | null;
  message: string;
}

function toTributeEditView(r: TributeEditRpcRow): TributeEditView {
  return {
    id: r.id,
    memorialId: r.memorial_id as MemorialId,
    status: r.status as TributeStatus,
    authorDisplayName: r.author_display_name,
    authorRelationship: r.author_relationship ?? null,
    message: r.message,
  };
}

class DrizzleTributeRepository implements TributeRepository {
  constructor(private readonly tx: Tx) {}

  async findById(id: string): Promise<TributeRow | null> {
    const [row] = await this.tx
      .select()
      .from(tributes)
      .where(and(eq(tributes.id, id), isNull(tributes.deletedAt)))
      .limit(1);
    return row ? toTributeRow(row) : null;
  }

  async create(input: NewTribute): Promise<TributeRow> {
    const createdAt = new Date().toISOString();
    try {
      await this.tx.insert(tributes).values({
        id: input.id,
        memorialId: input.memorialId,
        status: input.status,
        authorDisplayName: input.authorDisplayName,
        authorRelationship: input.authorRelationship,
        authorEmail: input.authorEmail,
        message: input.message,
        mediaId: input.mediaId,
        editToken: input.editToken,
        submittedIp: input.submittedIp,
        submittedUserAgent: input.submittedUserAgent,
        publishedAt: input.publishedAt,
        createdAt,
      });
    } catch (err) {
      translatePgError(err);
    }
    // `anon` has no SELECT grant on `tributes` (it reads the public_tributes
    // view) so we cannot read the row back — synthesise it from the input.
    return {
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
      createdAt,
    };
  }

  async moderate(id: string, patch: TributeModerationPatch): Promise<TributeRow> {
    const set: Record<string, unknown> = {
      status: patch.status,
      moderatedBy: patch.moderatedBy,
      moderatedAt: patch.moderatedAt,
    };
    if (patch.publishedAt !== undefined) set.publishedAt = patch.publishedAt;
    if (patch.moderationNote !== undefined) set.moderationNote = patch.moderationNote;
    try {
      await this.tx.update(tributes).set(set).where(eq(tributes.id, id));
    } catch (err) {
      translatePgError(err);
    }
    return this.require(id);
  }

  async pendingCount(memorialId: MemorialId): Promise<number> {
    const [row] = await this.tx
      .select({ n: sql<number>`count(*)::int` })
      .from(tributes)
      .where(
        and(
          eq(tributes.memorialId, memorialId),
          isNull(tributes.deletedAt),
          sql`${tributes.status} in ('pending','reported')`,
        ),
      );
    return row?.n ?? 0;
  }

  async recentFromIp(memorialId: MemorialId, ip: string, sinceIso: string): Promise<number> {
    const [row] = await this.tx.execute(
      sql`select public.recent_tributes_from_ip(${memorialId}::uuid, ${ip}::inet, ${sinceIso}::timestamptz) as n`,
    );
    return Number((row as { n: number | string } | undefined)?.n ?? 0);
  }

  async findByEditToken(token: string): Promise<TributeEditView | null> {
    const [row] = await this.tx.execute(
      sql`select * from public.resolve_tribute_edit_token(${token}::uuid)`,
    );
    return row ? toTributeEditView(row as TributeEditRpcRow) : null;
  }

  async editByToken(
    token: string,
    patch: {
      authorDisplayName: string;
      authorRelationship: string | null;
      message: string;
      status: Extract<TributeStatus, "pending" | "approved">;
    },
  ): Promise<TributeEditView | null> {
    const [row] = await this.tx.execute(
      sql`select * from public.apply_tribute_edit(
        ${token}::uuid, ${patch.authorDisplayName}, ${patch.authorRelationship}, ${patch.message}, ${patch.status}::tribute_status
      )`,
    );
    return row ? toTributeEditView(row as TributeEditRpcRow) : null;
  }

  private async require(id: string): Promise<TributeRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`tribute ${id} not readable after write (unexpected RLS state)`);
    return row;
  }
}

class DrizzleReportRepository implements ReportRepository {
  constructor(private readonly tx: Tx) {}

  async create(input: NewReport): Promise<{ id: string }> {
    try {
      await this.tx.insert(reports).values({
        id: input.id,
        memorialId: input.memorialId,
        tributeId: input.tributeId,
        reporterProfileId: input.reporterProfileId,
        reporterEmail: input.reporterEmail,
        reason: input.reason as ReportReason,
        details: input.details,
        status: "open",
        submittedIp: input.submittedIp,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      translatePgError(err);
    }
    return { id: input.id };
  }

  async findById(id: string): Promise<ReportRow | null> {
    const [row] = await this.tx.select().from(reports).where(eq(reports.id, id)).limit(1);
    return row ? toReportRow(row) : null;
  }

  async recentFromIp(ip: string, sinceIso: string): Promise<number> {
    const [row] = await this.tx.execute(
      sql`select public.recent_reports_from_ip(${ip}::inet, ${sinceIso}::timestamptz) as n`,
    );
    return Number((row as { n: number | string } | undefined)?.n ?? 0);
  }

  async resolve(id: string, patch: ReportResolution): Promise<ReportRow> {
    try {
      await this.tx
        .update(reports)
        .set({
          status: patch.status,
          resolvedBy: patch.resolvedBy,
          resolvedAt: patch.resolvedAt,
          resolutionNote: patch.resolutionNote,
        })
        .where(eq(reports.id, id));
    } catch (err) {
      translatePgError(err);
    }
    const row = await this.findById(id);
    if (!row) throw new Error(`report ${id} not readable after write (unexpected RLS state)`);
    return row;
  }
}

function toReportRow(r: typeof reports.$inferSelect): ReportRow {
  return {
    id: r.id,
    memorialId: r.memorialId ?? null,
    tributeId: r.tributeId ?? null,
    reason: r.reason as ReportRow["reason"],
    details: r.details ?? null,
    status: r.status as ReportRow["status"],
    resolvedBy: r.resolvedBy ?? null,
    resolvedAt: r.resolvedAt ?? null,
    resolutionNote: r.resolutionNote ?? null,
    createdAt: r.createdAt,
  };
}

class DrizzleServiceRequestRepository implements ServiceRequestRepository {
  constructor(private readonly tx: Tx) {}

  async create(input: NewServiceRequest): Promise<{ id: string }> {
    try {
      await this.tx.insert(serviceRequests).values({
        id: input.id,
        memorialId: input.memorialId,
        requestedBy: input.requestedBy,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        serviceType: input.serviceType,
        details: input.details,
        status: "new",
        submittedIp: input.submittedIp,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      translatePgError(err);
    }
    return { id: input.id };
  }

  async recentFromIp(ip: string, sinceIso: string): Promise<number> {
    const [row] = await this.tx.execute(
      sql`select public.recent_service_requests_from_ip(${ip}::inet, ${sinceIso}::timestamptz) as n`,
    );
    return Number((row as { n: number | string } | undefined)?.n ?? 0);
  }

  async findById(id: string): Promise<ServiceRequestRow | null> {
    const [row] = await this.tx
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id))
      .limit(1);
    return row ? toServiceRequestRow(row) : null;
  }

  async update(id: string, patch: ServiceRequestPatch): Promise<ServiceRequestRow> {
    const set: Record<string, unknown> = {};
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.assignedTo !== undefined) set.assignedTo = patch.assignedTo;
    if (patch.internalNotes !== undefined) set.internalNotes = patch.internalNotes;
    if (patch.resolvedAt !== undefined) set.resolvedAt = patch.resolvedAt;
    if (Object.keys(set).length > 0) {
      try {
        await this.tx.update(serviceRequests).set(set).where(eq(serviceRequests.id, id));
      } catch (err) {
        translatePgError(err);
      }
    }
    const row = await this.findById(id);
    if (!row)
      throw new Error(`service request ${id} not readable after write (unexpected RLS state)`);
    return row;
  }
}

function toServiceRequestRow(r: typeof serviceRequests.$inferSelect): ServiceRequestRow {
  return {
    id: r.id,
    memorialId: r.memorialId ?? null,
    requestedBy: r.requestedBy ?? null,
    contactName: r.contactName,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone ?? null,
    serviceType: r.serviceType as ServiceRequestRow["serviceType"],
    details: r.details ?? null,
    status: r.status as ServiceRequestRow["status"],
    assignedTo: r.assignedTo ?? null,
    internalNotes: r.internalNotes ?? null,
    createdAt: r.createdAt,
  };
}

const FUNERAL_DETAIL_COLUMNS = [
  "eventType",
  "title",
  "description",
  "eventDate",
  "startTime",
  "endTime",
  "timezone",
  "venueName",
  "addressLine",
  "city",
  "region",
  "country",
  "postalCode",
  "latitude",
  "longitude",
  "dressCode",
  "contacts",
  "livestreamUrl",
  "instructions",
  "visibility",
] as const;

function toFuneralEventRow(r: typeof funeralEvents.$inferSelect): FuneralEventRow {
  const num = (v: string | null) => (v === null ? null : Number(v));
  return {
    id: r.id,
    memorialId: r.memorialId as MemorialId,
    eventType: r.eventType as FuneralEventType,
    status: r.status as FuneralEventStatus,
    title: r.title,
    description: r.description ?? null,
    eventDate: r.eventDate ?? null,
    startTime: r.startTime ?? null,
    endTime: r.endTime ?? null,
    timezone: r.timezone ?? null,
    venueName: r.venueName ?? null,
    addressLine: r.addressLine ?? null,
    city: r.city ?? null,
    region: r.region ?? null,
    country: r.country ?? null,
    postalCode: r.postalCode ?? null,
    latitude: num(r.latitude ?? null),
    longitude: num(r.longitude ?? null),
    dressCode: r.dressCode ?? null,
    contacts: r.contacts ?? [],
    livestreamUrl: r.livestreamUrl ?? null,
    instructions: r.instructions ?? null,
    visibility: r.visibility as SectionVisibility,
    displayOrder: r.displayOrder,
    publishedAt: r.publishedAt ?? null,
    cancelledAt: r.cancelledAt ?? null,
    cancelReason: r.cancelReason ?? null,
  };
}

class DrizzleFuneralEventRepository implements FuneralEventRepository {
  constructor(private readonly tx: Tx) {}

  async listForMemorial(memorialId: MemorialId): Promise<FuneralEventRow[]> {
    const rows: (typeof funeralEvents.$inferSelect)[] = await this.tx
      .select()
      .from(funeralEvents)
      .where(and(eq(funeralEvents.memorialId, memorialId), isNull(funeralEvents.deletedAt)))
      .orderBy(asc(funeralEvents.displayOrder));
    return rows.map(toFuneralEventRow);
  }

  async findById(id: string): Promise<FuneralEventRow | null> {
    const [row] = await this.tx
      .select()
      .from(funeralEvents)
      .where(and(eq(funeralEvents.id, id), isNull(funeralEvents.deletedAt)))
      .limit(1);
    return row ? toFuneralEventRow(row) : null;
  }

  async create(input: NewFuneralEvent): Promise<FuneralEventRow> {
    try {
      await this.tx.insert(funeralEvents).values({
        id: input.id,
        memorialId: input.memorialId,
        eventType: input.eventType,
        status: "draft",
        title: input.title,
        description: input.description,
        eventDate: input.eventDate,
        startTime: input.startTime,
        endTime: input.endTime,
        timezone: input.timezone,
        venueName: input.venueName,
        addressLine: input.addressLine,
        city: input.city,
        region: input.region,
        country: input.country,
        postalCode: input.postalCode,
        latitude: input.latitude == null ? null : String(input.latitude),
        longitude: input.longitude == null ? null : String(input.longitude),
        dressCode: input.dressCode,
        contacts: input.contacts ?? [],
        livestreamUrl: input.livestreamUrl,
        instructions: input.instructions,
        visibility: input.visibility,
        displayOrder: input.displayOrder,
      });
    } catch (err) {
      translatePgError(err);
    }
    return this.require(input.id);
  }

  async update(id: string, patch: FuneralEventPatch): Promise<FuneralEventRow> {
    const set: Record<string, unknown> = {};
    for (const k of FUNERAL_DETAIL_COLUMNS) {
      if (k in patch && (patch as Record<string, unknown>)[k] !== undefined) {
        const v = (patch as Record<string, unknown>)[k];
        set[k] = (k === "latitude" || k === "longitude") && v != null ? String(v) : v;
      }
    }
    if (Object.keys(set).length > 0) {
      try {
        await this.tx.update(funeralEvents).set(set).where(eq(funeralEvents.id, id));
      } catch (err) {
        translatePgError(err);
      }
    }
    return this.require(id);
  }

  async applyLifecycle(id: string, patch: FuneralEventLifecyclePatch): Promise<FuneralEventRow> {
    const set: Record<string, unknown> = { status: patch.status };
    if (patch.publishedAt !== undefined) set.publishedAt = patch.publishedAt;
    if (patch.cancelledAt !== undefined) set.cancelledAt = patch.cancelledAt;
    if (patch.cancelReason !== undefined) set.cancelReason = patch.cancelReason;
    try {
      await this.tx.update(funeralEvents).set(set).where(eq(funeralEvents.id, id));
    } catch (err) {
      translatePgError(err);
    }
    return this.require(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.tx
      .update(funeralEvents)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(funeralEvents.id, id));
  }

  async setOrder(entries: { id: string; displayOrder: number }[]): Promise<void> {
    for (const { id, displayOrder } of entries) {
      await this.tx.update(funeralEvents).set({ displayOrder }).where(eq(funeralEvents.id, id));
    }
  }

  async publishedCount(memorialId: MemorialId): Promise<number> {
    const [row] = await this.tx
      .select({ n: sql<number>`count(*)::int` })
      .from(funeralEvents)
      .where(
        and(
          eq(funeralEvents.memorialId, memorialId),
          isNull(funeralEvents.deletedAt),
          eq(funeralEvents.status, "published"),
        ),
      );
    return row?.n ?? 0;
  }

  private async require(id: string): Promise<FuneralEventRow> {
    const row = await this.findById(id);
    if (!row)
      throw new Error(`funeral event ${id} not readable after write (unexpected RLS state)`);
    return row;
  }
}

function toFamilyUpdateRow(r: typeof familyUpdates.$inferSelect): FamilyUpdateRow {
  return {
    id: r.id,
    memorialId: r.memorialId as MemorialId,
    title: r.title,
    body: r.body,
    importance: r.importance as UpdateImportance,
    authorProfileId: r.authorProfileId ?? null,
    funeralEventId: r.funeralEventId ?? null,
    status: r.status as PublicationStatus,
    visibility: r.visibility as SectionVisibility,
    publishedAt: r.publishedAt ?? null,
    createdAt: r.createdAt,
  };
}

class DrizzleFamilyUpdateRepository implements FamilyUpdateRepository {
  constructor(private readonly tx: Tx) {}

  async listForMemorial(memorialId: MemorialId): Promise<FamilyUpdateRow[]> {
    const rows: (typeof familyUpdates.$inferSelect)[] = await this.tx
      .select()
      .from(familyUpdates)
      .where(and(eq(familyUpdates.memorialId, memorialId), isNull(familyUpdates.deletedAt)))
      .orderBy(sql`${familyUpdates.createdAt} desc`);
    return rows.map(toFamilyUpdateRow);
  }

  async findById(id: string): Promise<FamilyUpdateRow | null> {
    const [row] = await this.tx
      .select()
      .from(familyUpdates)
      .where(and(eq(familyUpdates.id, id), isNull(familyUpdates.deletedAt)))
      .limit(1);
    return row ? toFamilyUpdateRow(row) : null;
  }

  async create(input: NewFamilyUpdate): Promise<FamilyUpdateRow> {
    try {
      await this.tx.insert(familyUpdates).values({
        id: input.id,
        memorialId: input.memorialId,
        title: input.title,
        body: input.body,
        importance: input.importance,
        authorProfileId: input.authorProfileId,
        funeralEventId: input.funeralEventId,
        status: "draft",
        visibility: input.visibility,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      translatePgError(err);
    }
    return this.require(input.id);
  }

  async update(id: string, patch: FamilyUpdatePatch): Promise<FamilyUpdateRow> {
    const set: Record<string, unknown> = {};
    for (const k of ["title", "body", "importance", "funeralEventId", "visibility"] as const) {
      if (k in patch && (patch as Record<string, unknown>)[k] !== undefined) {
        set[k] = (patch as Record<string, unknown>)[k];
      }
    }
    if (Object.keys(set).length > 0) {
      try {
        await this.tx.update(familyUpdates).set(set).where(eq(familyUpdates.id, id));
      } catch (err) {
        translatePgError(err);
      }
    }
    return this.require(id);
  }

  async applyLifecycle(id: string, patch: FamilyUpdateLifecyclePatch): Promise<FamilyUpdateRow> {
    const set: Record<string, unknown> = { status: patch.status };
    if (patch.publishedAt !== undefined) set.publishedAt = patch.publishedAt;
    try {
      await this.tx.update(familyUpdates).set(set).where(eq(familyUpdates.id, id));
    } catch (err) {
      translatePgError(err);
    }
    return this.require(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.tx
      .update(familyUpdates)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(familyUpdates.id, id));
  }

  async publishedCount(memorialId: MemorialId): Promise<number> {
    const [row] = await this.tx
      .select({ n: sql<number>`count(*)::int` })
      .from(familyUpdates)
      .where(
        and(
          eq(familyUpdates.memorialId, memorialId),
          isNull(familyUpdates.deletedAt),
          eq(familyUpdates.status, "published"),
        ),
      );
    return row?.n ?? 0;
  }

  private async require(id: string): Promise<FamilyUpdateRow> {
    const row = await this.findById(id);
    if (!row)
      throw new Error(`family update ${id} not readable after write (unexpected RLS state)`);
    return row;
  }
}

function toShareResolverRow(r: typeof shareResolvers.$inferSelect): ShareResolverRow {
  return {
    id: r.id,
    memorialId: r.memorialId as MemorialId,
    token: r.token,
    label: r.label ?? null,
    medium: r.medium ?? null,
    isActive: r.isActive,
    createdAt: r.createdAt,
    retiredAt: r.retiredAt ?? null,
  };
}

class DrizzleShareResolverRepository implements ShareResolverRepository {
  constructor(private readonly tx: Tx) {}

  async listForMemorial(memorialId: MemorialId): Promise<ShareResolverRow[]> {
    const rows: (typeof shareResolvers.$inferSelect)[] = await this.tx
      .select()
      .from(shareResolvers)
      .where(eq(shareResolvers.memorialId, memorialId))
      .orderBy(sql`${shareResolvers.createdAt} desc`);
    return rows.map(toShareResolverRow);
  }

  async findById(id: string): Promise<ShareResolverRow | null> {
    const [row] = await this.tx
      .select()
      .from(shareResolvers)
      .where(eq(shareResolvers.id, id))
      .limit(1);
    return row ? toShareResolverRow(row) : null;
  }

  async create(input: NewShareResolver): Promise<ShareResolverRow> {
    // Unguessable, matches the DB `share_resolvers_token_shape` check (`^[a-f0-9]{12,}$`).
    const token = randomBytes(9).toString("hex");
    try {
      await this.tx.insert(shareResolvers).values({
        id: input.id,
        token,
        memorialId: input.memorialId,
        label: input.label,
        medium: input.medium,
        isActive: true,
        createdBy: input.createdBy,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      translatePgError(err);
    }
    return this.require(input.id);
  }

  async retire(id: string): Promise<ShareResolverRow> {
    await this.tx
      .update(shareResolvers)
      .set({ isActive: false, retiredAt: new Date().toISOString() })
      .where(eq(shareResolvers.id, id));
    return this.require(id);
  }

  private async require(id: string): Promise<ShareResolverRow> {
    const row = await this.findById(id);
    if (!row)
      throw new Error(`share resolver ${id} not readable after write (unexpected RLS state)`);
    return row;
  }
}

function toNotificationRow(r: typeof notifications.$inferSelect): NotificationRow {
  return {
    id: r.id,
    memorialId: r.memorialId ?? null,
    eventType: r.eventType as NotificationRow["eventType"],
    channel: r.channel as NotificationRow["channel"],
    payload: (r.payload ?? {}) as Record<string, unknown>,
    readAt: r.readAt ?? null,
    createdAt: r.createdAt,
  };
}

class DrizzleNotificationRepository implements NotificationRepository {
  constructor(
    private readonly tx: Tx,
    private readonly rls: RlsContext,
  ) {}

  async recordMany(entries: NewNotification[]): Promise<void> {
    if (entries.length === 0) return;
    // `notifications` denies `authenticated` an INSERT path — elevate for this
    // insert only (same pattern as `audit_logs`).
    await this.rls.withElevatedRole(async () => {
      await this.tx.insert(notifications).values(
        entries.map((e) => ({
          id: e.id,
          recipientProfileId: e.recipientProfileId,
          recipientEmail: e.recipientEmail,
          memorialId: e.memorialId,
          eventType: e.eventType,
          channel: e.channel,
          payload: e.payload,
          createdAt: new Date().toISOString(),
        })),
      );
    });
  }

  async memorialRecipientIds(memorialId: string): Promise<string[]> {
    // An anonymous submitter (or a non-member) cannot read
    // `memorial_memberships` under RLS, but their action still fans out to
    // the memorial's active members — elevate for this read only.
    return this.rls.withElevatedRole(async () => {
      const rows: { profileId: string | null }[] = await this.tx
        .select({ profileId: memorialMemberships.profileId })
        .from(memorialMemberships)
        .where(
          and(
            eq(memorialMemberships.memorialId, memorialId),
            eq(memorialMemberships.status, "active"),
          ),
        );
      return rows.map((r) => r.profileId).filter((id): id is string => id !== null);
    });
  }

  async listForRecipient(
    profileId: string,
    opts: { unreadOnly?: boolean; limit?: number } = {},
  ): Promise<NotificationRow[]> {
    const where = opts.unreadOnly
      ? and(
          eq(notifications.recipientProfileId, profileId),
          eq(notifications.channel, "in_app"),
          isNull(notifications.readAt),
        )
      : and(eq(notifications.recipientProfileId, profileId), eq(notifications.channel, "in_app"));
    const rows: (typeof notifications.$inferSelect)[] = await this.tx
      .select()
      .from(notifications)
      .where(where)
      .orderBy(sql`${notifications.createdAt} desc`)
      .limit(opts.limit ?? 30);
    return rows.map(toNotificationRow);
  }

  async unreadCount(profileId: string): Promise<number> {
    const [row] = await this.tx
      .select({ n: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientProfileId, profileId),
          eq(notifications.channel, "in_app"),
          isNull(notifications.readAt),
        ),
      );
    return row?.n ?? 0;
  }

  async markRead(ids: string[], profileId: string): Promise<void> {
    if (ids.length === 0) return;
    await this.tx
      .update(notifications)
      .set({ readAt: new Date().toISOString() })
      .where(and(inArray(notifications.id, ids), eq(notifications.recipientProfileId, profileId)));
  }

  async markAllRead(profileId: string): Promise<void> {
    await this.tx
      .update(notifications)
      .set({ readAt: new Date().toISOString() })
      .where(and(eq(notifications.recipientProfileId, profileId), isNull(notifications.readAt)));
  }
}

class DrizzleProfileRepository implements ProfileRepository {
  constructor(
    private readonly tx: Tx,
    private readonly rls: RlsContext,
  ) {}

  async platformAdminIds(): Promise<string[]> {
    // A non-staff (or anon) caller cannot SELECT other profiles — elevate to
    // read the staff list for staff-wide notifications.
    return this.rls.withElevatedRole(async () => {
      const rows: { id: string }[] = await this.tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.isPlatformAdmin, true));
      return rows.map((r) => r.id);
    });
  }
}

class DrizzleAuditRepository implements AuditRepository {
  constructor(
    private readonly tx: Tx,
    private readonly rls: RlsContext,
  ) {}

  async record(entry: AuditEntry): Promise<void> {
    // `audit_logs` denies `authenticated` an INSERT path by design; elevate for
    // this one statement only, then restore the caller's role.
    await this.rls.withElevatedRole(async () => {
      await this.tx.insert(auditLogs).values({
        actorProfileId: entry.actorProfileId,
        actorKind: entry.actorKind,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        memorialId: entry.memorialId,
        metadata: entry.metadata ?? {},
      });
    });
  }
}

export function buildRepositories(tx: Tx, rls: RlsContext): Repositories {
  return {
    memorials: new DrizzleMemorialRepository(tx),
    memberships: new DrizzleMembershipRepository(tx),
    slugs: new DrizzleMemorialSlugRepository(tx),
    settings: new DrizzleSettingsRepository(tx),
    story: new DrizzleStoryRepository(tx),
    milestones: new DrizzleMilestoneRepository(tx),
    albums: new DrizzleAlbumRepository(tx),
    media: new DrizzleMediaRepository(tx),
    tributes: new DrizzleTributeRepository(tx),
    funeralEvents: new DrizzleFuneralEventRepository(tx),
    familyUpdates: new DrizzleFamilyUpdateRepository(tx),
    shareResolvers: new DrizzleShareResolverRepository(tx),
    reports: new DrizzleReportRepository(tx),
    serviceRequests: new DrizzleServiceRequestRepository(tx),
    notifications: new DrizzleNotificationRepository(tx, rls),
    profiles: new DrizzleProfileRepository(tx, rls),
    audit: new DrizzleAuditRepository(tx, rls),
  };
}
