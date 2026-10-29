"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, FormField, Input } from "@evermora/ui";
import { slugify } from "@evermora/utils";
import { createMemorialAction } from "@/lib/actions/memorials";
import { FormError } from "@/components/form";

export function NewMemorialForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dateOfDeath, setDateOfDeath] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const effectiveSlug = slugEdited ? slug : slugify(fullName);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createMemorialAction({
        fullName: fullName.trim(),
        headline: headline.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        dateOfDeath: dateOfDeath || undefined,
        slug: effectiveSlug || undefined,
      });
      if (res.ok) {
        router.push(`/memorials/${res.data.memorialId}`);
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-5">
      <FormError message={error} />

      <FormField label="Their full name" required>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          maxLength={200}
          autoComplete="off"
        />
      </FormField>

      <FormField
        label="A short line about them"
        description="Optional — e.g. “Teacher, gardener, grandmother.”"
      >
        <Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={500} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Date of birth" description="Optional">
          <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        </FormField>
        <FormField label="Date of death" description="Optional">
          <Input type="date" value={dateOfDeath} onChange={(e) => setDateOfDeath(e.target.value)} />
        </FormField>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="slug" className="text-[13.5px] font-semibold text-fg">
          Memorial address
        </label>
        <div className="flex h-11 items-center gap-1 rounded-sm border border-line-strong bg-raised pl-3.5 text-base transition-colors focus-within:border-brand focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-brand">
          <span className="shrink-0 font-mono text-[13.5px] text-fg-subtle">evermora.com/</span>
          <Input
            id="slug"
            value={effectiveSlug}
            aria-describedby="slug-hint"
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(slugify(e.target.value));
            }}
            className="h-full flex-1 border-0 px-0 focus:outline-none"
          />
        </div>
        <p id="slug-hint" className="text-[12.5px] text-fg-subtle">
          Lowercase letters, numbers and hyphens. You can change it later — old links keep working.
        </p>
      </div>

      <Button
        type="submit"
        size="lg"
        loading={pending}
        disabled={!fullName.trim()}
        className="mt-2"
      >
        Create memorial
      </Button>
      <p className="text-xs text-fg-subtle">
        You&rsquo;ll be able to add a portrait, their story, photos, funeral information and privacy
        settings next — and publish whenever you&rsquo;re ready.
      </p>
    </form>
  );
}
