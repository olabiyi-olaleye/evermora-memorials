import "server-only";
import type { ServiceRequestType } from "@evermora/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface ServiceRequestItem {
  id: string;
  serviceType: ServiceRequestType;
  details: string | null;
  status: string;
  createdAt: string;
}

/** The signed-in user's own service requests for this memorial (via `my_service_requests`). */
export async function getMyServiceRequests(memorialId: string): Promise<ServiceRequestItem[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("my_service_requests")
    .select("id, service_type, details, status, created_at")
    .eq("memorial_id", memorialId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id as string,
    serviceType: r.service_type as ServiceRequestType,
    details: (r.details as string | null) ?? null,
    status: r.status as string,
    createdAt: r.created_at as string,
  }));
}
