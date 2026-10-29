"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { slugify } from "@evermora/utils";
import { Button, FormField, Input } from "@evermora/ui";
import { changeMemorialSlugAction } from "@/lib/actions/memorials";
import { FormError } from "@/components/form";

export function SlugForm({ memorialId, currentSlug }: { memorialId: string; currentSlug: string }) {
  const router = useRouter();
  const [value, setValue] = useState(currentSlug);
  const [error, setError] = useState<string | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const next = slugify(value);
  const dirty = next.length > 0 && next !== currentSlug;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedTo(null);
    start(async () => {
      const res = await changeMemorialSlugAction({ memorialId, newSlug: next });
      if (res.ok) {
        setValue(res.data.canonicalSlug);
        setSavedTo(res.data.canonicalSlug);
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <FormError message={error} />
      {savedTo ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-md border border-ok/40 bg-ok-soft px-3 py-2 text-sm text-fg"
        >
          <CheckCircle2 aria-hidden className="size-4 text-ok" />
          Address changed. Old links now redirect here.
        </p>
      ) : null}

      <FormField
        label="Memorial address"
        description="Letters, numbers and hyphens. Old links and printed QR codes keep working — they redirect to the new address."
      >
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[13px] text-fg-subtle">evermora.com/</span>
          <Input value={value} onChange={(e) => setValue(e.target.value)} className="font-mono" />
        </div>
      </FormField>

      {dirty ? (
        <p className="font-mono text-[13px] text-fg-muted">
          New address: evermora.com/<span className="text-fg">{next}</span>
        </p>
      ) : null}

      <div>
        <Button type="submit" loading={pending} disabled={!dirty}>
          Change address
        </Button>
      </div>
    </form>
  );
}
