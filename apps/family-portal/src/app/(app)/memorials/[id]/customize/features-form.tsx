"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@evermora/ui";
import { updateMemorialFeaturesAction } from "@/lib/actions/memorials";
import { FormError } from "@/components/form";
import { SettingRow } from "@/components/setting-row";
import type { MemorialFeatureSettings } from "@/lib/data/memorials";

type Key = keyof MemorialFeatureSettings;

const TOGGLES: { key: Key; label: string; help: string }[] = [
  { key: "tributesEnabled", label: "Tributes", help: "Let visitors leave a written tribute." },
  {
    key: "tributeModerationEnabled",
    label: "Review tributes before they appear",
    help: "When off, a valid tribute is shown straight away.",
  },
  {
    key: "photoContributionsEnabled",
    label: "Photo contributions",
    help: "Let visitors add photos for the family to review.",
  },
  { key: "candlesEnabled", label: "Candles & remembrances", help: "Let visitors light a candle." },
  { key: "funeralEnabled", label: "Funeral information", help: "Show the funeral section." },
  { key: "updatesEnabled", label: "Family updates", help: "Show official family notices." },
  { key: "sharingEnabled", label: "Sharing tools", help: "Show the share link and QR code." },
];

export function FeaturesForm({
  memorialId,
  features,
}: {
  memorialId: string;
  features: MemorialFeatureSettings;
}) {
  const router = useRouter();
  const [state, setState] = useState<MemorialFeatureSettings>(features);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = TOGGLES.some((t) => state[t.key] !== features[t.key]);

  function save() {
    setError(null);
    const patch: Record<string, boolean> = {};
    for (const t of TOGGLES) if (state[t.key] !== features[t.key]) patch[t.key] = state[t.key];
    startTransition(async () => {
      const res = await updateMemorialFeaturesAction({ memorialId, ...patch });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <FormError message={error} />
      {saved && !dirty ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-md border border-ok/40 bg-ok-soft px-3 py-2 text-sm text-fg"
        >
          <CheckCircle2 aria-hidden className="size-4 text-ok" />
          Sections updated.
        </p>
      ) : null}

      <div className="rounded-lg border border-line px-4">
        {TOGGLES.map((t) => (
          <SettingRow
            key={t.key}
            label={t.label}
            description={t.help}
            checked={state[t.key]}
            disabled={t.key === "tributeModerationEnabled" && !state.tributesEnabled}
            onCheckedChange={(c) => {
              setState((s) => ({ ...s, [t.key]: c }));
              setSaved(false);
            }}
          />
        ))}
      </div>

      <div>
        <Button type="button" onClick={save} loading={pending} disabled={!dirty}>
          Save sections
        </Button>
      </div>
    </div>
  );
}
