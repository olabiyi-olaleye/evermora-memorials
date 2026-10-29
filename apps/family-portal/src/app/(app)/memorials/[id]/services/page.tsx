import type { Metadata } from "next";
import { SectionHeader } from "@evermora/ui";
import { requireAuthUser } from "@/lib/auth";
import { getMemorialDetail } from "@/lib/data/memorials";
import { getMyServiceRequests } from "@/lib/data/services";
import { ServicesPanel } from "./services-panel";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [memorial, user] = await Promise.all([getMemorialDetail(id), requireAuthUser()]);
  if (!memorial) return null;

  const requests = await getMyServiceRequests(id);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Services"
        description="Ask the Evermora team for help — funeral planning, programme printing, livestreaming, catering, transport or flowers. Requests reach our team directly; we'll reply by email."
      />
      <ServicesPanel
        memorialId={id}
        defaultName={user.displayName ?? ""}
        defaultEmail={user.email ?? ""}
        requests={requests}
      />
    </div>
  );
}
