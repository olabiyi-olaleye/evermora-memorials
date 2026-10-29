"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { STORY_SECTION_KIND, type StorySectionKind } from "@evermora/types";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  Button,
  Card,
  CardBody,
  Checkbox,
  FormField,
  IconButton,
  Input,
  Select,
  StatusBadge,
  Textarea,
} from "@evermora/ui";
import { formatMemorialDate } from "@evermora/utils";
import { FormError } from "@/components/form";
import type { Milestone, StorySection } from "@/lib/data/story";
import {
  removeMilestoneAction,
  removeStorySectionAction,
  reorderMilestonesAction,
  reorderStorySectionsAction,
  saveMilestoneAction,
  saveStorySectionAction,
} from "@/lib/actions/story";

const KIND_LABEL: Record<StorySectionKind, string> = {
  biography: "Biography",
  early_life: "Early life",
  family: "Family",
  career: "Career",
  education: "Education",
  faith: "Faith",
  achievements: "Achievements",
  legacy: "Legacy",
  custom: "Custom",
};

export function StoryEditor({
  memorialId,
  sections,
  milestones,
}: {
  memorialId: string;
  sections: StorySection[];
  milestones: Milestone[];
}) {
  return (
    <div className="flex flex-col gap-12">
      <Sections memorialId={memorialId} sections={sections} />
      <Milestones memorialId={memorialId} milestones={milestones} />
    </div>
  );
}

/* ------------------------------ story sections ------------------------------ */

function Sections({ memorialId, sections }: { memorialId: string; sections: StorySection[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setEditing(null);
        setAdding(false);
        router.refresh();
      } else {
        setError(res.error?.message ?? "Something went wrong.");
      }
    });
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    act(() => reorderStorySectionsAction({ memorialId, orderedIds: next.map((s) => s.id) }));
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-fg">Sections</h2>
        </div>
        {!adding ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setAdding(true);
              setEditing(null);
            }}
          >
            Add a section
          </Button>
        ) : null}
      </div>

      <FormError message={error} />

      {sections.length === 0 && !adding ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-subtle">
          No sections yet. Add one to start telling their story.
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {sections.map((s, i) => (
          <li key={s.id}>
            <Card>
              <CardBody>
                {editing === s.id ? (
                  <SectionForm
                    memorialId={memorialId}
                    section={s}
                    pending={pending}
                    onCancel={() => setEditing(null)}
                    onSubmit={(data) =>
                      act(() => saveStorySectionAction({ ...data, id: s.id, memorialId }))
                    }
                  />
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-fg">
                        {s.title}
                        <StatusBadge status={s.status === "published" ? "published" : "draft"} />
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{s.body}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs">
                      <div className="flex gap-1">
                        <IconButton
                          aria-label="Move up"
                          size="sm"
                          disabled={pending || i === 0}
                          onClick={() => move(i, -1)}
                        >
                          <ChevronUp />
                        </IconButton>
                        <IconButton
                          aria-label="Move down"
                          size="sm"
                          disabled={pending || i === sections.length - 1}
                          onClick={() => move(i, 1)}
                        >
                          <ChevronDown />
                        </IconButton>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(s.id);
                            setAdding(false);
                          }}
                        >
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="secondary" size="sm">
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent
                            title={`Remove the “${s.title}” section?`}
                            description="It will be taken off the memorial. You can add it again later."
                            confirmLabel="Remove"
                            tone="danger"
                            onConfirm={() =>
                              act(() => removeStorySectionAction({ memorialId, id: s.id }))
                            }
                          />
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>

      {adding ? (
        <Card>
          <CardBody>
            <SectionForm
              memorialId={memorialId}
              pending={pending}
              onCancel={() => setAdding(false)}
              onSubmit={(data) => act(() => saveStorySectionAction({ ...data, memorialId }))}
            />
          </CardBody>
        </Card>
      ) : null}
    </section>
  );
}

function SectionForm({
  section,
  pending,
  onCancel,
  onSubmit,
}: {
  memorialId: string;
  section?: StorySection;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (data: {
    kind: StorySectionKind;
    title: string;
    body: string;
    status: "draft" | "published";
  }) => void;
}) {
  const publishId = useId();
  const [kind, setKind] = useState<StorySectionKind>(section?.kind ?? "custom");
  const [title, setTitle] = useState(section?.title ?? "");
  const [body, setBody] = useState(section?.body ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    section?.status === "published" ? "published" : "draft",
  );

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ kind, title: title.trim(), body: body.trim(), status });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <FormField label="Heading" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
          />
        </FormField>
        <FormField label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value as StorySectionKind)}>
            {STORY_SECTION_KIND.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Text" required>
        <Textarea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={20000}
        />
      </FormField>
      <div className="flex flex-wrap items-center gap-3">
        <Checkbox
          id={publishId}
          label="Show this section on the public memorial"
          checked={status === "published"}
          onCheckedChange={(c) => setStatus(c === true ? "published" : "draft")}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={pending}
            disabled={!title.trim() || !body.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}

/* -------------------------------- milestones -------------------------------- */

function Milestones({ memorialId, milestones }: { memorialId: string; milestones: Milestone[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; error?: { message: string } }>) {
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

  function move(index: number, dir: -1 | 1) {
    const next = [...milestones];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    act(() => reorderMilestonesAction({ memorialId, orderedIds: next.map((m) => m.id) }));
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-fg">Timeline</h2>
        </div>
        {!adding ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setAdding(true);
              setEditing(null);
            }}
          >
            Add a moment
          </Button>
        ) : null}
      </div>

      <FormError message={error} />

      {milestones.length === 0 && !adding ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-subtle">
          No moments yet — births, graduations, weddings, moves, retirements.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {milestones.map((m, i) => (
          <li key={m.id}>
            <Card>
              <CardBody>
                {editing === m.id ? (
                  <MilestoneForm
                    milestone={m}
                    pending={pending}
                    onCancel={() => setEditing(null)}
                    onSubmit={(data) =>
                      act(() => saveMilestoneAction({ ...data, id: m.id, memorialId }))
                    }
                  />
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-fg">
                        <span className="font-mono text-[13px] text-fg-muted">
                          {m.onDate ? formatMemorialDate(m.onDate) : m.year}
                        </span>
                        {" — "}
                        <span className="font-medium">{m.title}</span>
                        {m.status !== "published" ? (
                          <span className="ml-2 inline-flex align-middle">
                            <StatusBadge status="draft" />
                          </span>
                        ) : null}
                      </p>
                      {m.description ? (
                        <p className="mt-0.5 text-sm text-fg-muted">{m.description}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs">
                      <div className="flex gap-1">
                        <IconButton
                          aria-label="Move up"
                          size="sm"
                          disabled={pending || i === 0}
                          onClick={() => move(i, -1)}
                        >
                          <ChevronUp />
                        </IconButton>
                        <IconButton
                          aria-label="Move down"
                          size="sm"
                          disabled={pending || i === milestones.length - 1}
                          onClick={() => move(i, 1)}
                        >
                          <ChevronDown />
                        </IconButton>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(m.id);
                            setAdding(false);
                          }}
                        >
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="secondary" size="sm">
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent
                            title="Remove this moment?"
                            description="It will be taken off the timeline. You can add it again later."
                            confirmLabel="Remove"
                            tone="danger"
                            onConfirm={() =>
                              act(() => removeMilestoneAction({ memorialId, id: m.id }))
                            }
                          />
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>

      {adding ? (
        <Card>
          <CardBody>
            <MilestoneForm
              pending={pending}
              onCancel={() => setAdding(false)}
              onSubmit={(data) => act(() => saveMilestoneAction({ ...data, memorialId }))}
            />
          </CardBody>
        </Card>
      ) : null}
    </section>
  );
}

function MilestoneForm({
  milestone,
  pending,
  onCancel,
  onSubmit,
}: {
  milestone?: Milestone;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (data: {
    year?: number;
    onDate: string | null;
    title: string;
    description: string;
    status: "draft" | "published";
  }) => void;
}) {
  const publishId = useId();
  const [year, setYear] = useState(milestone ? String(milestone.year) : "");
  const [onDate, setOnDate] = useState(milestone?.onDate ?? "");
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    milestone?.status === "published" || !milestone ? "published" : "draft",
  );

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          year: onDate ? undefined : year ? Number(year) : undefined,
          onDate: onDate || null,
          title: title.trim(),
          description: description.trim(),
          status,
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <FormField label="Year">
          <Input
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1966"
          />
        </FormField>
        <FormField label="Exact date (optional)" className="sm:col-span-2">
          <Input type="date" value={onDate} onChange={(e) => setOnDate(e.target.value)} />
        </FormField>
      </div>
      <FormField label="What happened" required>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </FormField>
      <FormField label="A little more (optional)">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
        />
      </FormField>
      <div className="flex flex-wrap items-center gap-3">
        <Checkbox
          id={publishId}
          label="Show on the public timeline"
          checked={status === "published"}
          onCheckedChange={(c) => setStatus(c === true ? "published" : "draft")}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={pending}
            disabled={!title.trim() || (!year && !onDate)}
          >
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
