"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UPDATE_IMPORTANCE, type SectionVisibility, type UpdateImportance } from "@evermora/types";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  Badge,
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
import type { FamilyUpdate } from "@/lib/data/updates";
import {
  archiveFamilyUpdateAction,
  publishFamilyUpdateAction,
  removeFamilyUpdateAction,
  saveFamilyUpdateAction,
} from "@/lib/actions/updates";

const IMPORTANCE_LABEL: Record<UpdateImportance, string> = {
  normal: "Normal",
  high: "Important",
  urgent: "Urgent",
};

const VISIBILITY_LABEL: Record<string, string> = {
  inherit: "Follow the section setting",
  members: "Family members only",
  public: "Anyone who can see the memorial",
  private: "Hidden for now",
};

type ActionResult = { ok: boolean; error?: { message: string } };

export function UpdatesEditor({
  memorialId,
  updates,
}: {
  memorialId: string;
  updates: FamilyUpdate[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function act(fn: () => Promise<ActionResult>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setAdding(false);
        setEditing(null);
        router.refresh();
      } else {
        setError(res.error?.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-fg">Updates</h2>
        {!adding ? (
          <Button
            size="sm"
            onClick={() => {
              setAdding(true);
              setEditing(null);
            }}
          >
            Write an update
          </Button>
        ) : null}
      </div>

      <FormError message={error} />

      {updates.length === 0 && !adding ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-subtle">
          No updates yet. Post an official notice — a change of plans, streaming details, a
          thank-you. This isn&rsquo;t a social feed; there are no comments or reactions.
        </p>
      ) : null}

      {adding ? (
        <Card>
          <CardBody>
            <UpdateForm
              pending={pending}
              onCancel={() => setAdding(false)}
              onSubmit={(data) => act(() => saveFamilyUpdateAction({ ...data, memorialId }))}
            />
          </CardBody>
        </Card>
      ) : null}

      <ul className="flex flex-col gap-3">
        {updates.map((u) => (
          <li key={u.id} className="rounded-lg border border-line bg-raised p-5 shadow-e1">
            {editing === u.id ? (
              <UpdateForm
                update={u}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSubmit={(data) =>
                  act(() => saveFamilyUpdateAction({ ...data, id: u.id, memorialId }))
                }
              />
            ) : (
              <UpdateRow
                update={u}
                pending={pending}
                onEdit={() => {
                  setEditing(u.id);
                  setAdding(false);
                }}
                onPublish={() =>
                  act(() => publishFamilyUpdateAction({ memorialId, updateId: u.id }))
                }
                onArchive={() =>
                  act(() => archiveFamilyUpdateAction({ memorialId, updateId: u.id }))
                }
                onRemove={() => act(() => removeFamilyUpdateAction({ memorialId, updateId: u.id }))}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function UpdateRow({
  update: u,
  pending,
  onEdit,
  onPublish,
  onArchive,
  onRemove,
}: {
  update: FamilyUpdate;
  pending: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-fg">{u.title}</p>
          <StatusBadge
            status={u.status}
            label={
              u.status === "published" && u.visibility === "members"
                ? "Published · family only"
                : u.status[0]!.toUpperCase() + u.status.slice(1)
            }
          />
          {u.importance !== "normal" ? (
            <Badge tone="warn">{IMPORTANCE_LABEL[u.importance]}</Badge>
          ) : null}
        </div>
        <p className="mt-1.5 line-clamp-2 text-sm text-fg-muted">{u.body}</p>
        {u.publishedAt ? (
          <p className="mt-1 font-mono text-[11.5px] text-fg-subtle">
            {formatMemorialDate(u.publishedAt)}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onEdit} disabled={pending}>
          Edit
        </Button>
        {u.status === "draft" || u.status === "archived" ? (
          <Button size="sm" onClick={onPublish} loading={pending}>
            {u.status === "archived" ? "Re-publish" : "Publish"}
          </Button>
        ) : null}
        {u.status === "published" ? (
          <Button size="sm" variant="secondary" onClick={onArchive} disabled={pending}>
            Take down
          </Button>
        ) : null}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" disabled={pending}>
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            title={`Remove "${u.title}"?`}
            description="This update will be permanently deleted. This can't be undone."
            confirmLabel="Remove"
            tone="danger"
            onConfirm={onRemove}
          />
        </AlertDialog>
      </div>
    </div>
  );
}

interface UpdateFormData {
  title: string;
  body: string;
  importance: UpdateImportance;
  visibility: SectionVisibility;
}

function UpdateForm({
  update: u,
  pending,
  onCancel,
  onSubmit,
}: {
  update?: FamilyUpdate;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (data: UpdateFormData) => void;
}) {
  const [title, setTitle] = useState(u?.title ?? "");
  const [body, setBody] = useState(u?.body ?? "");
  const [importance, setImportance] = useState<UpdateImportance>(u?.importance ?? "normal");
  const [visibility, setVisibility] = useState<SectionVisibility>(u?.visibility ?? "inherit");

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title: title.trim(), body: body.trim(), importance, visibility });
      }}
    >
      <FormField label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </FormField>
      <FormField label="Update">
        <Textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={20000}
        />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Importance">
          <Select
            value={importance}
            onChange={(e) => setImportance(e.target.value as UpdateImportance)}
          >
            {UPDATE_IMPORTANCE.map((i) => (
              <option key={i} value={i}>
                {IMPORTANCE_LABEL[i]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Who can see this">
          <Select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as SectionVisibility)}
          >
            {(["inherit", "members", "public", "private"] as const).map((v) => (
              <option key={v} value={v}>
                {VISIBILITY_LABEL[v]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending} disabled={!title.trim() || !body.trim()}>
          {u ? "Save changes" : "Save draft"}
        </Button>
      </div>
      <p className="text-xs text-fg-subtle">
        New updates start as a draft. Publish it when you&rsquo;re ready for family and visitors to
        see it.
      </p>
    </form>
  );
}
