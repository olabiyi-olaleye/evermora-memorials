"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, QrCode, Share2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  Button,
  Card,
  CardBody,
  EmptyState,
  FormField,
  Input,
  Select,
} from "@evermora/ui";
import { FormError } from "@/components/form";
import { generateShareAssetAction, retireShareAssetAction } from "@/lib/actions/share";

const MEDIUM_LABEL: Record<string, string> = {
  funeral_programme: "Funeral programme",
  memorial_card: "Memorial card",
  banner: "Banner",
  reception_table: "Reception table",
  keepsake: "Keepsake",
  other: "Other",
};

const MEDIA = Object.keys(MEDIUM_LABEL);

interface Asset {
  id: string;
  token: string;
  label: string | null;
  medium: string | null;
  isActive: boolean;
  createdAt: string;
  url: string;
  svg: string | null;
}

export function SharePanel({
  memorialId,
  publicUrl,
  personName,
  canEdit,
  qrEnabled,
  assets,
}: {
  memorialId: string;
  publicUrl: string | null;
  personName: string;
  canEdit: boolean;
  qrEnabled: boolean;
  assets: Asset[];
}) {
  const active = assets.filter((a) => a.isActive);
  const retired = assets.filter((a) => !a.isActive);

  return (
    <div className="flex flex-col gap-10">
      {publicUrl ? <LinkSection url={publicUrl} personName={personName} /> : null}

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-serif text-lg text-fg">Printable QR codes</h2>
          <p className="mt-1 max-w-prose text-[13px] text-fg-subtle">
            Each code is permanent — even if the memorial address changes later, printed codes keep
            working. Make one per print run so you can retire an old batch without affecting the
            others.
          </p>
        </div>

        {!qrEnabled ? (
          <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-fg-muted">
            QR codes are turned off for this memorial in Privacy &amp; sections.
          </p>
        ) : (
          <>
            {canEdit ? <GenerateForm memorialId={memorialId} /> : null}

            {active.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {active.map((a) => (
                  <QrCard key={a.id} memorialId={memorialId} asset={a} canEdit={canEdit} />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<QrCode aria-hidden />}
                title="No QR codes yet"
                description="Create one for the funeral programme, an order of service, or a reception table card."
              />
            )}

            {retired.length > 0 ? (
              <details className="text-sm text-fg-subtle">
                <summary className="cursor-pointer font-medium hover:text-fg">
                  Retired codes ({retired.length})
                </summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {retired.map((a) => (
                    <li key={a.id}>
                      {a.label ?? MEDIUM_LABEL[a.medium ?? "other"]} —{" "}
                      <span className="font-mono text-xs">{a.token}</span> (still resolves; shows a
                      &ldquo;moved&rdquo; notice)
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function LinkSection({ url, personName }: { url: string; personName: string }) {
  const [copied, setCopied] = useState(false);
  const shareText = `In loving memory of ${personName}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${shareText} — ${url}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: shareText, text: shareText, url });
      } catch {
        /* dismissed */
      }
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-lg text-fg">Memorial link</h2>
      <p className="rounded-md bg-surface-subtle px-3.5 py-2.5 font-mono text-sm break-all text-fg">
        {url}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={copy} leadingIcon={copied ? <Check /> : <Copy />}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button asChild variant="secondary">
          <a href={whatsapp} target="_blank" rel="noreferrer noopener">
            Share on WhatsApp
          </a>
        </Button>
        <Button type="button" variant="secondary" onClick={nativeShare} leadingIcon={<Share2 />}>
          More…
        </Button>
      </div>
    </section>
  );
}

function GenerateForm({ memorialId }: { memorialId: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [medium, setMedium] = useState("funeral_programme");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await generateShareAssetAction({
        memorialId,
        label: label.trim() || undefined,
        medium: medium as never,
      });
      if (res.ok) {
        setLabel("");
        router.refresh();
      } else {
        setError(res.error?.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5">
          <FormError message={error} />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="For">
              <Select value={medium} onChange={(e) => setMedium(e.target.value)}>
                {MEDIA.map((m) => (
                  <option key={m} value={m}>
                    {MEDIUM_LABEL[m]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Label (optional)">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={120}
                placeholder="e.g. Funeral programme, Aug 2026"
              />
            </FormField>
          </div>
          <div>
            <Button type="submit" loading={pending}>
              Create a QR code
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function QrCard({
  memorialId,
  asset,
  canEdit,
}: {
  memorialId: string;
  asset: Asset;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const dataUri = asset.svg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svg)}`
    : null;
  const fileName = `evermora-qr-${asset.medium ?? "code"}-${asset.token.slice(0, 8)}.svg`;

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-4 shadow-e1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-fg">
          {asset.label ?? MEDIUM_LABEL[asset.medium ?? "other"]}
        </p>
        <span className="text-xs text-fg-subtle">{MEDIUM_LABEL[asset.medium ?? "other"]}</span>
      </div>
      {/* asset.svg is our own generated QR from a URL we control — no user input. */}
      {asset.svg ? (
        <div
          className="mx-auto w-36 rounded-md border border-line bg-canvas p-2"
          dangerouslySetInnerHTML={{ __html: asset.svg }}
        />
      ) : null}
      <p className="font-mono text-xs break-all text-fg-subtle">{asset.url}</p>
      <div className="flex flex-wrap gap-2">
        {dataUri ? (
          <Button asChild size="sm" variant="secondary">
            <a href={dataUri} download={fileName}>
              Download SVG
            </a>
          </Button>
        ) : null}
        {canEdit ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" disabled={pending}>
                Retire
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              title="Retire this QR code?"
              description="Anything already printed keeps working — a scan shows a gentle 'this has moved' notice instead of the memorial."
              confirmLabel="Retire"
              tone="danger"
              onConfirm={() =>
                start(async () => {
                  const res = await retireShareAssetAction({
                    memorialId,
                    shareResolverId: asset.id,
                  });
                  if (res.ok) router.refresh();
                })
              }
            />
          </AlertDialog>
        ) : null}
      </div>
    </li>
  );
}
