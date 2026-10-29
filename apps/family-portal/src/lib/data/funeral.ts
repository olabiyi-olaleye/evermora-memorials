import "server-only";
import type {
  FuneralEventContact,
  FuneralEventStatus,
  FuneralEventType,
  SectionVisibility,
} from "@evermora/types";
import { parseEventContacts } from "@evermora/utils";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface FuneralEvent {
  id: string;
  eventType: FuneralEventType;
  status: FuneralEventStatus;
  title: string;
  description: string | null;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  venueName: string | null;
  addressLine: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  dressCode: string | null;
  contacts: FuneralEventContact[];
  livestreamUrl: string | null;
  instructions: string | null;
  visibility: SectionVisibility;
  displayOrder: number;
  publishedAt: string | null;
  cancelReason: string | null;
}

/** Funeral events + planning status a family member can see for a memorial. RLS-bound. */
export async function getMemorialFuneral(
  memorialId: string,
): Promise<{ events: FuneralEvent[]; planningStatus: string }> {
  const supabase = await getSupabaseServer();
  const [{ data: events }, { data: memorial }] = await Promise.all([
    supabase
      .from("funeral_events")
      .select(
        "id, event_type, status, title, description, event_date, start_time, end_time, timezone, venue_name, address_line, city, region, country, postal_code, latitude, longitude, dress_code, contacts, livestream_url, instructions, visibility, display_order, published_at, cancel_reason",
      )
      .eq("memorial_id", memorialId)
      .is("deleted_at", null)
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("display_order", { ascending: true }),
    supabase.from("memorials").select("funeral_planning_status").eq("id", memorialId).maybeSingle(),
  ]);

  return {
    planningStatus: memorial?.funeral_planning_status ?? "not_started",
    events: (events ?? []).map((e) => ({
      id: e.id,
      eventType: e.event_type as FuneralEventType,
      status: e.status as FuneralEventStatus,
      title: e.title,
      description: e.description,
      eventDate: e.event_date,
      startTime: e.start_time,
      endTime: e.end_time,
      timezone: e.timezone,
      venueName: e.venue_name,
      addressLine: e.address_line,
      city: e.city,
      region: e.region,
      country: e.country,
      postalCode: e.postal_code,
      latitude: e.latitude,
      longitude: e.longitude,
      dressCode: e.dress_code,
      contacts: parseEventContacts(e.contacts),
      livestreamUrl: e.livestream_url,
      instructions: e.instructions,
      visibility: e.visibility as SectionVisibility,
      displayOrder: e.display_order,
      publishedAt: e.published_at,
      cancelReason: e.cancel_reason,
    })),
  };
}
