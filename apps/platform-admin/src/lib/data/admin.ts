import "server-only";
import type {
  ReportReason,
  ReportStatus,
  ServiceRequestStatus,
  ServiceRequestType,
} from "@evermora/types";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Platform-staff read layer. Platform admins have RLS SELECT on every table
 * here; a non-staff user simply sees nothing.
 */

export interface AdminCounts {
  memorials: number;
  published: number;
  suspended: number;
  openReports: number;
  newServiceRequests: number;
}

export async function getAdminCounts(): Promise<AdminCounts> {
  const supabase = await getSupabaseServer();
  const [all, published, suspended, reports, requests] = await Promise.all([
    supabase.from("memorials").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("memorials")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("memorials")
      .select("id", { count: "exact", head: true })
      .eq("status", "suspended"),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "reviewing"]),
    supabase
      .from("service_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "in_review"]),
  ]);
  return {
    memorials: all.count ?? 0,
    published: published.count ?? 0,
    suspended: suspended.count ?? 0,
    openReports: reports.count ?? 0,
    newServiceRequests: requests.count ?? 0,
  };
}

export interface AdminOverview {
  counts: AdminCounts;
  /** Oldest-first open reports — the triage queue. */
  openReports: AdminReport[];
  /** Service requests still needing action. */
  openServiceRequests: AdminServiceRequest[];
  /** Newest memorials — the closest thing to an activity feed we can read
   *  without an audit-log query (that op does not exist yet). */
  recentMemorials: AdminMemorial[];
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [counts, openReports, openServiceRequests, recentMemorials] = await Promise.all([
    getAdminCounts(),
    listReports(false),
    listServiceRequests(false),
    searchMemorials(""),
  ]);
  return {
    counts,
    openReports: openReports.slice(0, 6),
    openServiceRequests: openServiceRequests.slice(0, 6),
    recentMemorials: recentMemorials.slice(0, 6),
  };
}

export interface AdminMemorial {
  id: string;
  fullName: string;
  status: string;
  slug: string | null;
  suspendedReason: string | null;
  createdAt: string;
}

export async function searchMemorials(q: string): Promise<AdminMemorial[]> {
  const supabase = await getSupabaseServer();
  let query = supabase
    .from("memorials")
    .select(
      "id, full_name, status, suspended_reason, created_at, memorial_slugs(slug, is_canonical)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (q.trim()) query = query.ilike("full_name", `%${q.trim()}%`);

  const { data } = await query;
  return (data ?? []).map((m) => {
    const slugs = (m.memorial_slugs ?? []) as { slug: string; is_canonical: boolean }[];
    return {
      id: m.id,
      fullName: m.full_name,
      status: m.status,
      slug: slugs.find((s) => s.is_canonical)?.slug ?? null,
      suspendedReason: (m.suspended_reason as string | null) ?? null,
      createdAt: m.created_at,
    };
  });
}

export interface AdminReport {
  id: string;
  memorialId: string | null;
  tributeId: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  createdAt: string;
  memorialName: string | null;
}

export async function listReports(includeResolved: boolean): Promise<AdminReport[]> {
  const supabase = await getSupabaseServer();
  let query = supabase
    .from("reports")
    .select(
      "id, memorial_id, tribute_id, reason, details, status, resolution_note, created_at, memorials(full_name)",
    )
    .order("created_at", { ascending: true })
    .limit(100);
  if (!includeResolved) query = query.in("status", ["open", "reviewing"]);

  const { data } = await query;
  return (data ?? []).map((r) => ({
    id: r.id,
    memorialId: r.memorial_id,
    tributeId: r.tribute_id,
    reason: r.reason as ReportReason,
    details: r.details,
    status: r.status as ReportStatus,
    resolutionNote: (r.resolution_note as string | null) ?? null,
    createdAt: r.created_at,
    memorialName: (r.memorials as unknown as { full_name: string } | null)?.full_name ?? null,
  }));
}

export interface AdminServiceRequest {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  serviceType: ServiceRequestType;
  details: string | null;
  status: ServiceRequestStatus;
  assignedTo: string | null;
  internalNotes: string | null;
  createdAt: string;
  memorialName: string | null;
}

export async function listServiceRequests(includeClosed: boolean): Promise<AdminServiceRequest[]> {
  const supabase = await getSupabaseServer();
  let query = supabase
    .from("service_requests")
    .select(
      "id, contact_name, contact_email, contact_phone, service_type, details, status, assigned_to, internal_notes, created_at, memorials(full_name)",
    )
    .order("created_at", { ascending: true })
    .limit(100);
  if (!includeClosed) query = query.not("status", "in", "(completed,declined,cancelled)");

  const { data } = await query;
  return (data ?? []).map((r) => ({
    id: r.id,
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    serviceType: r.service_type as ServiceRequestType,
    details: r.details,
    status: r.status as ServiceRequestStatus,
    assignedTo: r.assigned_to,
    internalNotes: (r.internal_notes as string | null) ?? null,
    createdAt: r.created_at,
    memorialName: (r.memorials as unknown as { full_name: string } | null)?.full_name ?? null,
  }));
}
