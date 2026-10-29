"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, FormField, Input, Select, Textarea } from "@evermora/ui";
import { submitServiceRequestAction, type ServiceRequestFields } from "@/lib/actions";

const SERVICE_TYPES: { value: ServiceRequestFields["serviceType"]; label: string }[] = [
  { value: "funeral_planning", label: "Funeral planning" },
  { value: "printing", label: "Programme / card printing" },
  { value: "livestream", label: "Livestreaming" },
  { value: "catering", label: "Catering" },
  { value: "transport", label: "Transport" },
  { value: "flowers", label: "Flowers" },
  { value: "other", label: "Something else" },
];

export function ServiceRequestForm({ memorialId }: { memorialId?: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-lg border border-ok/40 bg-ok-soft px-4 py-5 text-sm text-fg"
      >
        <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-ok" />
        <div>
          <p className="font-semibold">Thank you — we&rsquo;ve got your message.</p>
          <p className="mt-1 text-fg-muted">
            Someone from the Evermora team will be in touch soon at the email you gave us.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
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
            serviceType: data.get("serviceType") as ServiceRequestFields["serviceType"],
            details: String(data.get("details") ?? "") || undefined,
            website: String(data.get("website") ?? "") || undefined,
          });
          if (res.ok) setDone(true);
          else setError(res.error.message);
        });
      }}
    >
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-bad/40 bg-bad-soft px-3 py-2 text-sm text-bad"
        >
          {error}
        </p>
      ) : null}

      <FormField label="Your name" required>
        <Input name="contactName" required maxLength={160} autoComplete="name" />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Email" required>
          <Input name="contactEmail" type="email" required maxLength={320} autoComplete="email" />
        </FormField>
        <FormField label="Phone" description="Optional">
          <Input name="contactPhone" maxLength={60} autoComplete="tel" inputMode="tel" />
        </FormField>
      </div>

      <FormField label="What do you need?">
        <Select name="serviceType" defaultValue="funeral_planning">
          {SERVICE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Anything else we should know?" description="Optional">
        <Textarea name="details" rows={4} maxLength={4000} />
      </FormField>

      {/* Honeypot: hidden from people, tempting to bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div>
        <Button type="submit" size="lg" loading={pending}>
          Send message
        </Button>
      </div>
    </form>
  );
}
