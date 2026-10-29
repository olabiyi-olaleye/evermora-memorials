"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { SERVICE_REQUEST_TYPE, type ServiceRequestType } from "@evermora/types";
import {
  Button,
  Card,
  CardBody,
  FormField,
  Input,
  Select,
  StatusBadge,
  Textarea,
} from "@evermora/ui";
import { formatMemorialDate } from "@evermora/utils";
import { FormError } from "@/components/form";
import type { ServiceRequestItem } from "@/lib/data/services";
import { submitServiceRequestAction } from "@/lib/actions/services";

const TYPE_LABEL: Record<ServiceRequestType, string> = {
  funeral_planning: "Funeral planning",
  printing: "Programme / card printing",
  livestream: "Livestreaming",
  catering: "Catering",
  transport: "Transport",
  flowers: "Flowers",
  other: "Something else",
};

/** How each status reads to the family (softer than the internal enum). */
const STATUS_LABEL: Record<string, string> = {
  new: "Received",
  in_review: "In review",
  contacted: "We've been in touch",
  scheduled: "Scheduled",
  completed: "Completed",
  declined: "Closed",
  cancelled: "Cancelled",
};

export function ServicesPanel({
  memorialId,
  defaultName,
  defaultEmail,
  requests,
}: {
  memorialId: string;
  defaultName: string;
  defaultEmail: string;
  requests: ServiceRequestItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-lg text-fg">Request help</h2>
        {sent ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-md border border-ok/40 bg-ok-soft px-4 py-3 text-sm text-fg"
          >
            <CheckCircle2 aria-hidden className="size-4 text-ok" />
            Sent. The Evermora team will reply by email.
          </p>
        ) : (
          <Card>
            <CardBody>
              <form
                className="flex max-w-2xl flex-col gap-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  setError(null);
                  const data = new FormData(e.currentTarget);
                  start(async () => {
                    const res = await submitServiceRequestAction({
                      memorialId,
                      contactName: String(data.get("contactName") ?? ""),
                      contactEmail: String(data.get("contactEmail") ?? ""),
                      contactPhone: String(data.get("contactPhone") ?? "") || undefined,
                      serviceType: data.get("serviceType") as ServiceRequestType,
                      details: String(data.get("details") ?? "") || undefined,
                    });
                    if (res.ok) {
                      setSent(true);
                      router.refresh();
                    } else {
                      setError(res.error.message);
                    }
                  });
                }}
              >
                <FormError message={error} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Your name" required>
                    <Input name="contactName" required defaultValue={defaultName} />
                  </FormField>
                  <FormField label="Email" required>
                    <Input name="contactEmail" type="email" required defaultValue={defaultEmail} />
                  </FormField>
                  <FormField label="Phone (optional)">
                    <Input name="contactPhone" maxLength={60} inputMode="tel" />
                  </FormField>
                  <FormField label="What do you need?">
                    <Select name="serviceType" defaultValue="funeral_planning">
                      {SERVICE_REQUEST_TYPE.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABEL[t]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>
                <FormField label="Details (optional)">
                  <Textarea name="details" rows={4} maxLength={4000} />
                </FormField>
                <div>
                  <Button type="submit" loading={pending}>
                    Send request
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}
      </section>

      {requests.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-lg text-fg">Your requests</h2>
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-fg">{TYPE_LABEL[r.serviceType]}</p>
                  {r.details ? (
                    <p className="mt-0.5 line-clamp-2 text-fg-muted">{r.details}</p>
                  ) : null}
                  <p className="mt-1 font-mono text-[11.5px] text-fg-subtle">
                    {formatMemorialDate(r.createdAt) ?? ""}
                  </p>
                </div>
                <StatusBadge status={r.status} label={STATUS_LABEL[r.status] ?? r.status} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
