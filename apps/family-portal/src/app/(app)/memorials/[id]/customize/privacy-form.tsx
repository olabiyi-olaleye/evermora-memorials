"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { MEMORIAL_VISIBILITY, type MemorialVisibility } from "@evermora/types";
import { Button, cn, Radio, RadioGroup } from "@evermora/ui";
import { updateMemorialPrivacyAction } from "@/lib/actions/memorials";
import { FormError } from "@/components/form";
import { SettingRow } from "@/components/setting-row";
import { VISIBILITY_HELP, VISIBILITY_LABEL } from "@/lib/format";

export function PrivacyForm({
  memorialId,
  visibility,
  searchIndexingEnabled,
}: {
  memorialId: string;
  visibility: MemorialVisibility;
  searchIndexingEnabled: boolean;
}) {
  const router = useRouter();
  const [vis, setVis] = useState<MemorialVisibility>(visibility);
  const [indexing, setIndexing] = useState(searchIndexingEnabled);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = vis !== visibility || indexing !== searchIndexingEnabled;

  const summary =
    vis === "private"
      ? "Only people you invite can open this memorial."
      : vis === "anyone_with_link"
        ? "Anyone with the link can open it. It won't appear in an Evermora listing."
        : indexing
          ? "Anyone can open it, and search engines may list it."
          : "Anyone can open it, but search engines are asked not to list it.";

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateMemorialPrivacyAction({
        memorialId,
        visibility: vis,
        searchIndexingEnabled: vis === "public" ? indexing : false,
      });
      if (res.ok) {
        setVis(res.data.visibility as MemorialVisibility);
        setIndexing(res.data.searchIndexingEnabled);
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <FormError message={error} />
      {saved && !dirty ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-md border border-ok/40 bg-ok-soft px-3 py-2 text-sm text-fg"
        >
          <CheckCircle2 aria-hidden className="size-4 text-ok" />
          Privacy updated.
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-fg">Who can view this memorial</legend>
        <RadioGroup
          value={vis}
          onValueChange={(v) => {
            setVis(v as MemorialVisibility);
            setSaved(false);
          }}
          className="flex flex-col gap-2"
        >
          {MEMORIAL_VISIBILITY.map((option) => (
            <div
              key={option}
              className={cn(
                "rounded-md border p-3.5 transition-colors",
                vis === option ? "border-brand bg-brand-soft/40" : "border-line",
              )}
            >
              <Radio
                id={`vis-${option}`}
                value={option}
                label={VISIBILITY_LABEL[option]}
                description={VISIBILITY_HELP[option]}
              />
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="rounded-md border border-line px-4">
        <SettingRow
          label="Allow search engines to list this memorial"
          description="Separate from visibility. Even a public memorial stays out of Google unless you turn this on. Only available while the memorial is public."
          checked={vis === "public" && indexing}
          disabled={vis !== "public"}
          onCheckedChange={(c) => {
            setIndexing(c);
            setSaved(false);
          }}
        />
      </div>

      <p className="flex items-start gap-2 text-[13px] leading-relaxed text-fg-muted">
        <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent" />
        {summary}
      </p>

      <div>
        <Button type="button" onClick={save} loading={pending} disabled={!dirty}>
          Save privacy
        </Button>
      </div>
    </div>
  );
}
