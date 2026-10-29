import { createHash } from "node:crypto";
import { ImageResponse } from "next/og";
import { formatLifespan, initialsOf } from "@evermora/utils";
import {
  getPublicGallery,
  resolvePublicMemorial,
  type PublicMemorial,
  type PublicPhoto,
} from "@/lib/memorial";

/**
 * The link-preview image for a memorial page (WhatsApp/iMessage/Slack/etc.
 * unfurl this when the link is shared) — the `opengraph-image` and
 * `twitter-image` route handlers both call this. There was no `og:image` anywhere on
 * this app before; without one, most unfurlers show either the browser's
 * generic apple-touch-icon or nothing at all, never anything recognisable.
 *
 * Which photo, in order: the family's own deliberate choice
 * (`memorials.cover_media_id`, set from Photos & memories — independent of
 * the portrait shown on the page itself), then the portrait, then the first
 * photo in a published album, then — only for a memorial with no photos at
 * all — an initials tile.
 *
 * A private/draft/unknown slug gets the same generic brand fallback as a
 * request with no slug at all — resolvePublicMemorial already returns
 * `not_found` for those indistinguishably (the point of that function), and
 * this route must keep that promise even though it's reached independently
 * of the page route itself (a crawler can hit it directly).
 */
const BRAND = "#2f5a4c";
const ON_BRAND = "#f6f3ea";

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

export async function renderMemorialShareImage(slug: string): Promise<ImageResponse> {
  const result = await resolvePublicMemorial(slug);
  if (result.kind !== "ok") return renderFallback();

  const { memorial } = result;
  const lifespan = formatLifespan(memorial.dateOfBirth, memorial.dateOfDeath);
  const photo = await pickSharePhoto(memorial);

  return photo?.url
    ? renderPhotoCard(memorial.fullName, lifespan, photo.url)
    : renderInitialsCard(memorial.fullName, lifespan);
}

/**
 * The photo the share image is drawn from — the single source of truth for
 * both the render above and {@link shareImageVersion}, so the version can
 * never disagree with what's actually in the picture.
 */
async function pickSharePhoto(memorial: PublicMemorial): Promise<PublicPhoto | null> {
  const { portrait, cover, photos } = await getPublicGallery(
    memorial.id,
    memorial.portraitMediaId,
    memorial.coverMediaId,
  );
  // The family's own deliberate choice wins; the on-page portrait is next
  // (already what they picked to represent the person); failing that, the
  // first gallery photo is a better guess than a bare initials tile; only a
  // memorial with no photos at all falls all the way back to that. A chosen
  // photo with no URL (not signed/ready yet) is skipped, same as absent.
  return [cover, portrait, photos[0]].find((p) => p?.url) ?? null;
}

/**
 * A short fingerprint of everything drawn into the share image — the chosen
 * photo, the name, the lifespan — for the `v` query param generateMetadata
 * puts on the image URL. Any change to the picture changes the URL, which is
 * what makes WhatsApp & co. fetch it fresh instead of serving a cached copy.
 */
export async function shareImageVersion(memorial: PublicMemorial): Promise<string> {
  const photo = await pickSharePhoto(memorial);
  const lifespan = formatLifespan(memorial.dateOfBirth, memorial.dateOfDeath);
  return createHash("sha256")
    .update(JSON.stringify([photo?.id ?? null, memorial.fullName, lifespan]))
    .digest("hex")
    .slice(0, 12);
}

function renderPhotoCard(
  fullName: string,
  lifespan: string | null,
  photoUrl: string,
): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        background: BRAND,
        overflow: "hidden",
      }}
    >
      {/* Blurred, zoomed copy fills the frame edge-to-edge so the sharp photo
       * below never needs to be cropped to fit an arbitrary aspect ratio. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (Satori), not the DOM */}
      <img
        src={photoUrl}
        alt=""
        width={SHARE_IMAGE_SIZE.width}
        height={SHARE_IMAGE_SIZE.height}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(20px)",
          transform: "scale(1.2)",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          inset: 0,
          background: "rgba(20,20,16,0.35)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (Satori), not the DOM */}
      <img
        src={photoUrl}
        alt=""
        width={SHARE_IMAGE_SIZE.width}
        height={SHARE_IMAGE_SIZE.height}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(20,20,16,0.82), rgba(20,20,16,0) 58%)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 56,
        }}
      >
        <div style={{ display: "flex", fontSize: 56, fontWeight: 600, color: ON_BRAND }}>
          {fullName}
        </div>
        {lifespan ? (
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: 28,
              letterSpacing: 2,
              color: "rgba(246,243,234,0.82)",
            }}
          >
            {lifespan}
          </div>
        ) : null}
      </div>
    </div>,
    SHARE_IMAGE_SIZE,
  );
}

function renderInitialsCard(fullName: string, lifespan: string | null): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: BRAND,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 220,
          height: 220,
          borderRadius: 28,
          background: "rgba(246,243,234,0.12)",
          fontSize: 92,
          fontWeight: 600,
          color: ON_BRAND,
        }}
      >
        {initialsOf(fullName)}
      </div>
      <div
        style={{ display: "flex", marginTop: 36, fontSize: 44, fontWeight: 600, color: ON_BRAND }}
      >
        {fullName}
      </div>
      {lifespan ? (
        <div
          style={{
            display: "flex",
            marginTop: 10,
            fontSize: 24,
            letterSpacing: 2,
            color: "rgba(246,243,234,0.75)",
          }}
        >
          {lifespan}
        </div>
      ) : null}
    </div>,
    SHARE_IMAGE_SIZE,
  );
}

function renderFallback(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: BRAND,
      }}
    >
      <div style={{ display: "flex", fontSize: 200, fontWeight: 600, color: ON_BRAND }}>E</div>
      <div
        style={{
          display: "flex",
          marginTop: 8,
          fontSize: 32,
          letterSpacing: 4,
          color: "rgba(246,243,234,0.8)",
        }}
      >
        EVERMORA
      </div>
    </div>,
    SHARE_IMAGE_SIZE,
  );
}
