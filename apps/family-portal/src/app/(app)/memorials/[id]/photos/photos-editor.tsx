"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  FormField,
  Input,
  SectionHeader,
  Select,
  cn,
} from "@evermora/ui";
import { FormError } from "@/components/form";
import type { GalleryAlbum, GalleryPhoto } from "@/lib/data/media";
import {
  finalizePhotoUploadAction,
  removeAlbumAction,
  removePhotoAction,
  saveAlbumAction,
  setCoverAction,
  setPortraitAction,
  updatePhotoAction,
} from "@/lib/actions/media";
import { compressImageForUpload } from "@/lib/image-compress";
import { PHOTO_BUCKET } from "@/lib/media-constants";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Result = { ok: boolean; error?: { message: string } };
type Act = (fn: () => Promise<Result>) => void;

export function PhotosEditor({
  memorialId,
  albums,
  photos,
  portraitMediaId,
  coverMediaId,
}: {
  memorialId: string;
  albums: GalleryAlbum[];
  photos: GalleryPhoto[];
  portraitMediaId: string | null;
  coverMediaId: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error?.message ?? "Something went wrong.");
    });
  }

  async function uploadOne(file: File): Promise<{ ok: boolean; name: string; error?: string }> {
    const name = file.name || "photo";
    const supabase = getSupabaseBrowser();
    // Best-effort client-side shrink — the finalize step re-validates and
    // re-derives everything from the actual bytes regardless.
    const prepared = await compressImageForUpload(file);
    const ext = prepared.name.split(".").pop()?.toLowerCase() || "jpg";
    const storagePath = `${memorialId}/gallery/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(storagePath, prepared, { contentType: prepared.type, upsert: false });
    if (uploadError) {
      return { ok: false, name, error: "The upload was rejected. Please try again." };
    }

    try {
      const finalized = await finalizePhotoUploadAction({ memorialId, storagePath });
      if (finalized.ok) return { ok: true, name };
      return { ok: false, name, error: finalized.error.message };
    } catch {
      // Finalize never landed (network drop) — tidy up the orphaned object.
      await supabase.storage
        .from(PHOTO_BUCKET)
        .remove([storagePath])
        .catch(() => {});
      return { ok: false, name, error: "The upload didn't finish. Please try again." };
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setNotice(null);
    setUploading(true);
    try {
      const results = await Promise.all(Array.from(files).map(uploadOne));
      const failed = results.filter((r) => !r.ok);
      const added = results.length - failed.length;
      if (failed.length) {
        setError(
          failed.map((f) => `${f.name}: ${f.error}`).join(" · ") +
            (added ? ` (${added} added)` : ""),
        );
      } else {
        setNotice(`${added} photo${added === 1 ? "" : "s"} added.`);
      }
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Upload */}
      <section className="flex flex-col gap-3">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void onFiles(e.dataTransfer.files);
          }}
          className="flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-surface px-6 py-8 text-center text-sm text-fg-muted"
        >
          <ImagePlus aria-hidden className="mb-2 size-6 text-fg-subtle" />
          <p className="font-medium text-fg">Add photos</p>
          <p className="mt-1 text-xs text-fg-subtle">
            JPEG, PNG, WebP or GIF, up to 15 MB each. Drag them here or choose files.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            onChange={(e) => void onFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Choose files"}
          </Button>
        </div>
        <FormError message={error} />
        {uploading || notice ? (
          <p role="status" className={cn("text-sm", uploading ? "text-fg-muted" : "text-ok")}>
            {uploading ? "Uploading…" : notice}
          </p>
        ) : null}
      </section>

      {/* Albums */}
      <Albums memorialId={memorialId} albums={albums} pending={pending} act={act} />

      {/* Photos */}
      <section className="flex flex-col gap-4">
        <SectionHeader title={`Photos${photos.length ? ` (${photos.length})` : ""}`} />
        {photos.length === 0 ? (
          <EmptyState
            icon={<ImagePlus />}
            title="No photos yet"
            description="Add photos above and they'll appear here."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {photos.map((p) => (
              <PhotoCard
                key={p.id}
                memorialId={memorialId}
                photo={p}
                albums={albums}
                isPortrait={portraitMediaId === p.id}
                isCover={coverMediaId === p.id}
                pending={pending}
                act={act}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Albums({
  memorialId,
  albums,
  pending,
  act,
}: {
  memorialId: string;
  albums: GalleryAlbum[];
  pending: boolean;
  act: Act;
}) {
  const [title, setTitle] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Albums</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {albums.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {albums.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm text-fg"
              >
                <span>
                  {a.title}
                  <span className="ml-2 text-xs text-fg-subtle">
                    {a.status === "published" ? "published" : "draft"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {a.status !== "published" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        act(() =>
                          saveAlbumAction({
                            memorialId,
                            id: a.id,
                            title: a.title,
                            status: "published",
                          }),
                        )
                      }
                    >
                      Publish
                    </Button>
                  ) : null}
                  <ConfirmButton
                    label="Remove"
                    title="Remove this album?"
                    description={`The album “${a.title}” will be removed. The photos stay in the library.`}
                    confirmLabel="Remove"
                    disabled={pending}
                    onConfirm={() => act(() => removeAlbumAction({ memorialId, id: a.id }))}
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="flex items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            act(() => saveAlbumAction({ memorialId, title: title.trim() }));
            setTitle("");
          }}
        >
          <FormField label="New album title" hideLabel className="flex-1">
            <Input
              inputSize="sm"
              placeholder="New album title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
            />
          </FormField>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            loading={pending}
            disabled={pending || !title.trim()}
          >
            Add
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function PhotoCard({
  memorialId,
  photo,
  albums,
  isPortrait,
  isCover,
  pending,
  act,
}: {
  memorialId: string;
  photo: GalleryPhoto;
  albums: GalleryAlbum[];
  isPortrait: boolean;
  isCover: boolean;
  pending: boolean;
  act: Act;
}) {
  const [caption, setCaption] = useState(photo.caption ?? "");
  const dirty = caption !== (photo.caption ?? "");

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-raised p-2">
      <div className="relative aspect-square overflow-hidden rounded-md bg-surface-subtle">
        {photo.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL, external host
          <img
            src={photo.url}
            alt={photo.altText ?? photo.caption ?? ""}
            className="h-full w-full rounded-md object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-fg-subtle">
            Preview unavailable
          </span>
        )}
        {isPortrait ? (
          <Badge tone="brand" withDot className="absolute top-1 left-1">
            Portrait
          </Badge>
        ) : null}
        {isCover ? (
          <Badge tone="accent" withDot className="absolute top-1 right-1">
            Share image
          </Badge>
        ) : null}
      </div>

      <FormField label="Caption" hideLabel>
        <Input
          inputSize="sm"
          placeholder="Add a caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={1000}
          onBlur={() => {
            if (dirty)
              act(() => updatePhotoAction({ memorialId, id: photo.id, caption: caption.trim() }));
          }}
        />
      </FormField>

      {albums.length > 0 ? (
        <FormField label="Album" hideLabel>
          <Select
            selectSize="sm"
            value={photo.albumId ?? ""}
            onChange={(e) =>
              act(() =>
                updatePhotoAction({ memorialId, id: photo.id, albumId: e.target.value || null }),
              )
            }
          >
            <option value="">No album</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </Select>
        </FormField>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {!isPortrait ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => act(() => setPortraitAction({ memorialId, mediaId: photo.id }))}
            >
              Make portrait
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => act(() => setPortraitAction({ memorialId, mediaId: null }))}
            >
              Unset portrait
            </Button>
          )}
          {!isCover ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => act(() => setCoverAction({ memorialId, mediaId: photo.id }))}
            >
              Use as share image
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => act(() => setCoverAction({ memorialId, mediaId: null }))}
            >
              Unset share image
            </Button>
          )}
        </div>
        <div className="flex justify-end">
          <ConfirmButton
            label="Remove"
            title="Remove this photo?"
            description="It will be taken off the memorial and any album. This can't be undone."
            confirmLabel="Remove"
            disabled={pending}
            onConfirm={() => act(() => removePhotoAction({ memorialId, id: photo.id }))}
          />
        </div>
      </div>
    </li>
  );
}

function ConfirmButton({
  label,
  title,
  description,
  confirmLabel,
  disabled,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="sm" disabled={disabled}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        tone="danger"
        onConfirm={onConfirm}
      />
    </AlertDialog>
  );
}
