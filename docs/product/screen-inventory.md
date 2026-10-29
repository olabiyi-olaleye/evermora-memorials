# Screen inventory

Every significant screen. **Planned** — none are built. Each entry covers:
purpose · primary user · entry points · sections · fields · actions · validation
· states (loading / empty / error / success) · permissions · mobile vs desktop ·
backend/domain interactions · analytics events.

Conventions: "states" lists only the non-obvious ones. "Backend" names the
[domain operation](../domain/operations/) or read. Analytics names are from
[analytics.md](./analytics.md).

---

# `apps/web` (public)

## Public memorial page — `/{slug}`

- **Purpose** the product: a person's memorial.
- **User** visitor (anonymous); also family (logged out) and crawlers.
- **Entry** shared link, QR/`/q/{token}` redirect, search (if indexing on),
  family portal "View public memorial".
- **Sections** (in order, each shown only if it has published content **and**
  section privacy allows this viewer):
  1. Hero — portrait (or initials, in a card) + name + preferred name +
     birth–death dates + memorial message (`memorials.headline`), then
     "Survived by" (`memorials.survived_by`), if set.
  2. Gallery — published `albums` / `media`; tap → lightbox.
  3. Their story — a word-limited excerpt of the first published
     `story_sections` row, with "Read more" → `/{slug}/story` (every
     published section, in full) when there's more than that excerpt.
  4. Family updates — published `family_updates`, newest first, importance
     styling.
  5. Funeral — published `funeral_events` (date, time, venue, map link,
     livestream link, dress code, instructions); cancelled events shown
     **clearly as cancelled** with the reason.
  6. Timeline — published `milestones`, chronological.
  7. Tributes — approved tributes (via `public_tributes`); "leave a tribute"
     affordance if `tributes_enabled`.
  8. Details — born / died / resting place, when any is present.
- **Fields** none (read-only page).
- **Actions** Share (native share sheet / copy link), Leave a tribute, Light a
  candle, Report (subtle), open livestream link, open map link.
- **Validation** n/a.
- **States**
  - _loading_: server-rendered — first paint is content, not a spinner.
  - _empty_: a freshly published memorial with only name + portrait still reads
    as complete and dignified (no "no tributes yet — be the first!" nagging;
    an optional quiet "No tributes have been shared yet").
  - _not available_: memorial is draft/archived/suspended/private/missing →
    respectful "This memorial isn't available" (404-style), never a login prompt.
- **Permissions** `app.can_read_memorial(id)` + per-section
  `app.can_read_memorial_section`. `noindex` unless
  `search_indexing_enabled`.
- **Mobile** single column, portrait-led, sticky slim name header, bottom
  share/contribute bar; targets ≥ 44px. **Desktop** same single column, capped
  measure, more whitespace — never a multi-column dashboard.
- **Backend** cached server render, tag `memorial:{id}`; reads `memorials`,
  `memorial_slugs` (resolve), `story_sections`, `albums`, `media`,
  `public_tributes`, `remembrance_action_counts`, `funeral_events`,
  `family_updates`, `memorial_people`, `feature_settings`, `privacy_settings`.
- **Analytics** `FIRST_VISITOR` (first ever view), `FUNERAL_EVENT_VIEWED`,
  page-level view count (aggregate, if `visitor_analytics_enabled`).

## Their story — `/{slug}/story`

- **Purpose** the full text of every published story section, for a visitor
  who followed "Read more" past the main page's excerpt.
- **User** visitor (anonymous); also family and crawlers.
- **Entry** "Read more" on the main memorial page's "Their story" section.
  404s if there's no published story section (nothing this page adds over
  the excerpt already shown, or the memorial itself isn't visible).
- **Sections** back-to-memorial link, memorial name, every published
  `story_sections` row in full (same order, same typography as the main
  page's excerpt — just untruncated).
- **Backend** reads `memorials`, `memorial_slugs` (resolve), `story_sections`
  — same public read layer as the main memorial page.

## Leave a tribute — `/{slug}` (inline panel or `/{slug}/tribute`)

- **Purpose** let a visitor post a message; **no account**.
- **User** visitor.
- **Entry** "Leave a tribute" on the memorial page.
- **Fields** display name (required, 1–120), relationship (optional, e.g.
  "Former colleague"), message (required, 1–5000), email (optional — **private**,
  only used to tell them if it's approved), photo (optional, only if
  `photo_contributions_enabled`), a bot check (PLANNED).
- **Actions** Submit, Cancel.
- **Validation** inline per field; preserve input on error; message length
  counter; photo type/size client check then server re-check.
- **States** _submitting_ (disabled button + spinner), _success_ ("Thank you —
  your tribute will appear once the family approves it." — set expectation of
  moderation when `tribute_moderation_enabled`), _error_ (keep the text, show a
  retry), _rate-limited_ ("Please wait a moment before submitting again.").
- **Permissions** anon allowed iff `tributes_enabled`; row created as `pending`
  (RLS `WITH CHECK`).
- **Mobile/Desktop** full-width form on mobile; modal/side panel on desktop.
- **Backend** `submitTribute` domain op (contract TBD) → `tributes` insert
  (+ `tribute-uploads` storage if photo); notification `tribute_submitted` to
  moderators.
- **Analytics** `TRIBUTE_SUBMITTED`.

## Light a candle / remembrance — `/{slug}` inline

- **Purpose** a one-tap gesture.
- **Fields** optional display name, optional short message (≤ 500).
- **Actions** pick a gesture (candle / flower / prayer / stone / heart) → Send.
- **Validation** minimal; a client `visitor_session` token soft-dedupes one
  gesture-type per session.
- **States** optimistic increment; _duplicate_ ("You've already lit a candle
  here").
- **Permissions** anon iff `candles_enabled`.
- **Backend** `remembrance_actions` insert; page reads
  `remembrance_action_counts`.
- **Analytics** `REMEMBRANCE_LEFT`.

## Report — `/{slug}` (subtle link) / report a tribute (per-tribute menu)

- **Purpose** abuse / privacy / impersonation / inaccuracy channel.
- **Fields** reason (radio: spam / abuse / impersonation / privacy / inaccurate
  / other), details (optional), email (optional, for follow-up — private).
- **Actions** Submit report.
- **States** _success_ ("Thank you. Our team will review this." — no public
  signal, no counter), _rate-limited_.
- **Permissions** always available (even anon).
- **Backend** `reportMemorial` → `reports` insert (+ tribute → `reported`);
  notification `memorial_reported` to staff.
- **Analytics** none visitor-facing (staff-side only).

## QR / share resolver — `/q/{token}` (`/s/{token}`)

- **Purpose** make a printed QR permanent.
- **States** _active_ → 302 to `/{canonical_slug}`; _retired/inactive_ →
  gentle "This memorial has moved or been archived" with a link home;
  _unknown token_ → 404.
- **Backend** `resolve_share_token(token)`.
- **Analytics** `QR_OPENED`.

## Marketing pages — `/about /contact /services /pricing /privacy /terms /help`

- **Purpose** explain Evermora; legal.
- **User** prospective family.
- **Actions** "Create a memorial" → family portal.
- **States** static.
- **Analytics** standard page views.

## Not-found — `404`

- Respectful copy, link to home and to "create a memorial". Never implies the
  memorial is private ("not available" wording is reserved for the memorial
  route; a genuine bad path says "page not found").

## Offline — `/offline` — **IMPLEMENTED** (Phase 5P)

- The PWA service worker's offline fallback — shown for a fresh navigation
  that can't reach the network and wasn't already cached. Static, data-free.
  Copy: reconnect to try again; a memorial you've already opened still works
  offline. `apps/family-portal` has its own `/offline` with copy for the
  authenticated app (managing a memorial needs a connection).

---

# `apps/family-portal` (authenticated)

## Sign in / Sign up / Forgot / Reset password

- **Purpose** authentication (Supabase Auth).
- **Fields** email + password (+ confirm on sign-up; + display name optional);
  reset: email; new password + confirm.
- **Validation** email format; password ≥ min length; clear "wrong email or
  password" (no user enumeration).
- **States** _submitting_, _needs email confirmation_ (if enabled in prod),
  _link expired_ (reset), _success_ → redirect to `next` or dashboard.
- **Permissions** public.
- **Mobile/Desktop** centered card.
- **Backend** Supabase Auth; `profiles` row auto-created by trigger on first
  sign-up.
- **Analytics** sign-up conversion (aggregate).

## Accept invitation — `/invite/{membershipId}` — **IMPLEMENTED** (Phase 5K)

- **Purpose** join a memorial team.
- **Sections** who invited you, which memorial, which role (`memorial_invite_preview` RPC).
- **Actions** Accept invitation (auth-gated), Not now.
- **States** _valid_, _not available_ ("already used / cancelled / different email").
- **Permissions** the caller's **verified JWT email** must equal `invited_email`
  — enforced by `accept_memorial_invite(uuid)` (SECURITY DEFINER).
- **Backend** `accept_memorial_invite` RPC → membership `invited → active`,
  `profile_id` linked, `memorial_admin.accepted` audit.
- **Analytics** `INVITE_ACCEPTED` — deferred.

## Dashboard — `/`

- **Purpose** list the memorials the user belongs to; entry to create.
- **Sections** memorial cards (portrait, name, status badge, your role, quick
  link), "Create a memorial" CTA, pending invitations, a "needs attention"
  strip (tributes awaiting moderation, unpublished funeral events).
- **States** _empty_ (no memberships) → a warm single CTA to create;
  _loading_ → skeleton cards.
- **Permissions** shows only memorials where the user has an `active` (or
  `invited`) membership.
- **Backend** read `memorial_memberships` + `memorials` for the user.
- **Analytics** —.

## Create a memorial (wizard) — `/memorials/new`

Multi-step, one step per screen on mobile. See
[flows/memorial-creation.md](./flows/memorial-creation.md).

- **Steps / fields**
  1. **Who** — full name (required, 1–200), preferred name, date of birth, date
     of death, birthplace. Validation: `date_of_death ≥ date_of_birth`.
  2. **Address** — slug (prefilled from the name; live availability check via
     `slug_is_available`; grammar hints). Validation: 3–63, lowercase
     `a-z0-9-`, no edge/double hyphen, not pure-numeric, not reserved, not
     taken.
  3. **Portrait** — upload one photo (optional but strongly encouraged).
  4. **Message** — a short memorial message / headline.
  5. **Visibility** — Private (default) / Anyone with the link / Public;
     separate "allow search engines" toggle (default off) with a plain-language
     explanation.
  6. **Review** → Create draft.
- **Actions** Back, Next, Save & exit (draft persists), Create.
- **States** _saving_, _slug unavailable_ (inline, suggest alternatives),
  _upload failed_ (retry), _created_ → memorial overview with a checklist.
- **Permissions** any signed-in user.
- **Mobile** one step per screen, progress indicator. **Desktop** left step
  rail + form.
- **Backend** `createMemorial` (on final step) → `memorials` + owner membership
  - settings + first slug; portrait upload → `media`.
- **Analytics** `MEMORIAL_STARTED` (step 1 committed), `MEMORIAL_PUBLISHED`
  later.

## Memorial overview — `/memorials/{id}` / `/overview`

- **Purpose** command center for one memorial.
- **Sections** status (draft/published/archived/suspended) + primary action
  (Publish / View public / Restore), a **completion checklist** (portrait,
  message, at least one story, visibility set, funeral added), attention items
  (N tributes pending, unpublished events), recent activity (from `audit_logs`
  scoped to this memorial), quick links to every section.
- **States** _suspended_ → a clear banner ("This memorial has been suspended by
  Evermora. Contact support.") with editing disabled.
- **Permissions** any active member; the primary action respects
  `memorial.edit`.
- **Backend** reads `memorials`, counts, `audit_logs` (member with
  `admins.manage` sees full; others see a limited feed or none).
- **Analytics** —.

## Story editor — `/memorials/{id}/story`

- **Purpose** memorial message + ordered life-story sections.
- **Sections** the memorial message field; a list of story sections (kind,
  title, published/draft, visibility), reorderable; an editor pane.
- **Fields per section** kind (biography / early_life / family / career /
  education / faith / achievements / legacy / custom), title (1–200), body
  (rich-ish text, sanitised), visibility (`inherit` / `public` / `members` /
  `private`), status (draft / published).
- **Actions** Add section, Edit, Reorder (drag / up-down), Publish / Unpublish,
  Delete (soft), Preview.
- **Validation** title required; body length bounded; unsaved-changes guard.
- **States** _saving_ (autosave indicator), _empty_ (a prompt with example
  section types), _conflict_ (someone else edited — reload).
- **Permissions** `story.edit`.
- **Mobile** list → full-screen editor. **Desktop** two-pane.
- **Backend** story CRUD ops (contracts TBD) → `story_sections`; publish is a
  status change; `revalidateTag('memorial:{id}:story')`.
- **Analytics** `STORY_SECTION_ADDED`.

## Gallery — `/memorials/{id}/gallery`

- **Purpose** albums + photos.
- **Sections** albums grid; within an album, a media grid; an upload dropzone.
- **Fields** album: title (1–160), description, cover, visibility, status.
  media: caption, alt text (required for accessibility), visibility, order.
- **Actions** Create album, Upload (multi), Set cover, Reorder, Move to album,
  Edit caption/alt, Delete (soft), Publish album.
- **Validation** file type against the bucket allow-list; size caps
  (`memorial-public` 25 MB); alt text prompt.
- **States** _uploading_ (per-file progress), _processing_ (`media.processing_status`),
  _failed_ (retry per file), _empty_.
- **Permissions** `gallery.manage`.
- **Backend** signed upload to `memorial-public` / `memorial-private` → `media`
  rows; see [../architecture/media-storage.md](../architecture/media-storage.md).
- **Analytics** `PHOTO_UPLOADED`.

## People (family section) — `/memorials/{id}/people`

- **Purpose** related people shown on the memorial.
- **Fields** full name (1–200), relationship, is-deceased, short bio, photo,
  order.
- **Actions** Add, Edit, Reorder, Delete (soft).
- **States** _empty_ (explains this is `members`-only by default until the
  family opens it).
- **Permissions** `memorial.edit`; **visible on the public memorial only if**
  `family_section_enabled` **and** `privacy_settings.family_details_visibility`
  allows the viewer.
- **Backend** `memorial_people` CRUD.
- **Analytics** —.

## Tribute moderation queue — `/memorials/{id}/tributes`

- **Purpose** approve / reject / hide visitor tributes.
- **Sections** tabs: Pending (default) / Approved / Rejected / Hidden / Reported;
  each item shows author display name, relationship, **email (moderator view
  only)**, message, photo, submitted-at.
- **Actions** Approve, Reject (with reason), Hide (for approved), Restore, open
  reporter details (if reported).
- **Validation** reject requires a reason (internal).
- **States** _empty_ ("No tributes waiting"), _bulk_ (select multiple → approve),
  _conflict_ (already moderated by a co-moderator — refresh).
- **Permissions** `tributes.moderate` (owner / admin / tribute_moderator).
- **Mobile** stacked cards, swipe or button actions. **Desktop** list + detail.
- **Backend** [`approveTribute`](../domain/operations/approve-tribute.md) /
  [`rejectTribute`](../domain/operations/reject-tribute.md) /
  [`hideTribute`](../domain/operations/hide-tribute.md); the queue reads the
  base `tributes` table (members only). Private columns via `service_role`
  server read.
- **Analytics** `TRIBUTE_APPROVED`.

## Funeral events — `/memorials/{id}/funeral`

- **Purpose** create/manage multiple structured funeral events.
- **Sections** event list (type, date/time, venue, status), an editor.
- **Fields** type, title (1–200), description, date, start/end time, timezone,
  venue name + address + city/region/country + coordinates, dress code, contact
  name/phone, livestream URL, instructions, visibility, order.
- **Actions** Add event, Edit, Publish, Cancel (reason), Reorder, Delete draft.
- **Validation** `end_time ≥ start_time`; coordinate ranges; URL validation;
  publish requires title + date.
- **States** _draft badge_, _published_, _cancelled_ (prominent), _empty_ (a
  prompt: "Funeral details can be added any time — publishing the memorial
  doesn't wait for them").
- **Permissions** `funeral.manage`.
- **Backend** [`saveFuneralEvent`](../domain/operations/save-funeral-event.md)
  / [`publishFuneralEvent` · `completeFuneralEvent`](../domain/operations/publish-funeral-event.md)
  / [`cancelFuneralEvent`](../domain/operations/cancel-funeral-event.md)
  / `removeFuneralEvent` / `setFuneralPlanningStatus`. **IMPLEMENTED** (Phase 5H).
- **Analytics** —.

## Family updates — `/memorials/{id}/updates`

- **Purpose** post official notices.
- **Fields** title (1–200), body, importance (normal / high / urgent), link to a
  funeral event (optional), visibility.
- **Actions** Write an update, Save draft, Publish, Edit, Take down (archive),
  Re-publish, Remove.
- **Validation** title + body required; both sanitised to plain text; a linked
  funeral event must belong to the memorial.
- **States** _draft_, _published_ (published-at shown; "family only" when
  members-only), _archived_, _importance chip_.
- **Permissions** `updates.publish`.
- **Backend** [`saveFamilyUpdate`](../domain/operations/save-family-update.md) /
  `publishFamilyUpdate` / `archiveFamilyUpdate` / `removeFamilyUpdate`.
  **IMPLEMENTED** (Phase 5I).
- **Analytics** `FAMILY_UPDATE_PUBLISHED` — deferred.

## Draft preview — `/memorials/{id}/preview`

- **Purpose** see the memorial as the public will, **without** a public URL.
- **Sections** the public memorial rendering, inside a device-frame toggle
  (mobile / desktop), with a "you are previewing a draft" banner.
- **Actions** Publish (if `memorial.edit`), back to editing.
- **Permissions** any active member (draft preview is a membership right).
- **Backend** same reads as the public page but bypassing the
  `status = published` gate for members (RLS already allows members to read
  drafts).
- **Analytics** —.

## Family access — `/memorials/{id}/family` — **IMPLEMENTED** (Phase 5K)

- **Purpose** manage the memorial's team.
- **Sections** invite form; people with access (name, role, status); pending
  invitations (each with a copy-able `/invite/{id}` link, since emails aren't
  sent yet); "Hand over ownership" (owner only).
- **Fields** invite: email + role (not owner). Per-member: role select.
- **Actions** Send invitation, Cancel invite, Change role, Suspend / Restore /
  Remove member, Transfer.
- **Validation** cannot remove/demote the last owner; cannot invite/set `owner`;
  cannot change your own access.
- **States** _view-only_ (no `admins.manage`), _last-owner blocked_,
  _self-change blocked_.
- **Permissions** `admins.manage`; transfer = owner only.
- **Backend** [`inviteMemorialAdmin`](../domain/operations/invite-memorial-admin.md),
  [`changeMemorialRole`](../domain/operations/change-memorial-role.md),
  [`transferMemorialOwnership`](../domain/operations/transfer-memorial-ownership.md).
- **Analytics** `INVITE_SENT` — deferred.

## Privacy — `/memorials/{id}/privacy`

- **Purpose** control who sees what. See
  [privacy-visibility-ux.md](./privacy-visibility-ux.md).
- **Fields** memorial visibility (Private / Anyone with link / Public);
  **separate** "Allow search engines to index this memorial" toggle (default
  off); per-section visibility for family details, funeral events, burial
  location, photos, story, updates, documents (`inherit` / `public` / `members`
  / `private`).
- **Actions** Save (may require re-auth on a downgrade from public → private
  is fine; upgrade to public may confirm).
- **Validation** none blocking; a summary sentence explains the resulting
  behaviour ("Anyone with the link can view this memorial. Search engines will
  not list it. Burial location is hidden from the public.").
- **States** _saved_, _published-memorial warning_ if turning a section public.
- **Permissions** `privacy.manage`.
- **Backend** `updatePrivacySettings` → `privacy_settings`; `revalidateTag`.
- **Analytics** —.

## Features — `/memorials/{id}/features`

- **Fields** the fixed toggle set (tributes, moderation, photo contributions,
  candles, funeral, family section, updates, sharing, QR, visitor analytics).
- **Actions** toggle → autosave.
- **States** _effect note_ under each toggle ("Turning this off immediately
  stops new tributes.").
- **Permissions** `memorial.edit`.
- **Backend** `updateFeatureSettings` → `feature_settings`.
- **Analytics** —.

## Share — `/memorials/{id}/share`

**IMPLEMENTED** (Phase 5J).

- **Purpose** get the memorial in front of people.
- **Sections** the public URL (copy / WhatsApp / Web Share API), create a QR code
  (medium: programme / card / banner / reception table / keepsake / other +
  optional label), list of active QR codes (inline SVG + Download SVG), a
  collapsible list of retired codes.
- **Actions** Copy link, Share on WhatsApp, More… (native share), Create a QR
  code, Download SVG, Retire.
- **States** _not published yet_ (sharing tools disabled with an explanation),
  _sharing disabled_ (`sharing_enabled` off), _QR disabled_ (`qr_code_enabled` off).
- **Permissions** `memorial.edit`; QR needs `qr_code_enabled`.
- **Backend** [`generateShareAsset` · `retireShareAsset`](../domain/operations/generate-share-asset.md)
  → `share_resolvers`; QR image via `@evermora/utils` `qrSvg`.
- **Analytics** `MEMORIAL_SHARED` / `QR_OPENED` — deferred.
- **Analytics** `MEMORIAL_SHARED`.

## Settings — `/memorials/{id}/settings`

- **Fields** change slug (with the alias-history explanation), archive memorial,
  delete memorial (owner only, typed confirmation).
- **Actions** Change slug, Archive, Delete.
- **Validation** slug rules; delete requires typing the memorial name + is
  owner-only + re-auth.
- **States** _slug changed_ ("Old links will keep working."), _archived_,
  _delete confirmation_.
- **Permissions** slug/archive = `memorial.edit`; delete = `memorial.delete`
  (owner).
- **Backend** [`changeMemorialSlug`](../domain/operations/change-memorial-slug.md),
  [`archiveMemorial`](../domain/operations/archive-memorial.md), delete op.
- **Analytics** `MEMORIAL_ARCHIVED`.

## Services — `apps/web /services` and `apps/family-portal /memorials/{id}/services` — **IMPLEMENTED** (Phase 5L)

- **Purpose** submit and track requests for Evermora-facilitated services.
- **Fields** contact name / email / phone, service type, details. The family
  page pre-fills name + email and attaches the memorial + `requested_by`.
- **Sections** request form (public page includes a hidden honeypot); family
  page also lists that user's own requests with a status chip.
- **Actions** Send request.
- **States** status chips (Received / In review / We've been in touch / Scheduled
  / Completed / Closed / Cancelled).
- **Permissions** anyone (incl. anon) submits; the requester reads their own via
  the `my_service_requests` view (never `internal_notes` / `assigned_to`); the
  base table is platform-staff only.
- **Backend** [`requestFuneralService`](../domain/operations/request-funeral-service.md).
- **Analytics** `SERVICE_REQUEST_SUBMITTED` — deferred.

## Notifications — `/notifications`

- **Sections** list of `notifications` for the user, unread first; filters by
  memorial.
- **Actions** mark read / mark all read; deep-link to the relevant screen.
- **States** _empty_, _unread badge_. Email delivery is **deferred** — this is
  in-app only for MVP.
- **Permissions** own notifications only.
- **Backend** read/update `notifications` (recipient-scoped RLS).

## Notification bell (global, in the app shell) — **IMPLEMENTED** (Phase 5N)

- **Purpose** the in-app notification centre — not a standalone route, a bell
  rendered in every authenticated page's layout (`(app)/layout.tsx`).
- **Sections** an unread-count badge; an open dropdown lists up to 30 recent
  `channel = 'in_app'` notifications, newest first, each with a short
  description, a relative timestamp, and an unread dot; items with a
  `memorialId` link to that memorial.
- **Actions** open/close the dropdown; click an item (marks it read, navigates
  if it links somewhere); "Mark all read".
- **States** _empty_ ("No notifications yet."), _unread_ (red dot + badge
  count, "9+" above 9).
- **Permissions** a recipient sees and marks read only their own rows (RLS
  `notifications_select_own` / `notifications_update_own`).
- **Backend** [`listMyNotifications` / `markNotificationsRead`](../domain/operations/notifications.md).
  `channel = 'email'` rows (e.g. `admin_invited`) are recorded but never
  rendered here — they're for the (not yet built) delivery worker.
- **Analytics** none yet.

## Account — `/account`

- **Fields** display name, full name, avatar, email (change → re-verify),
  password change, timezone/locale, marketing opt-in.
- **Actions** Save, Change email, Change password, Sign out (all devices).
- **States** _email change pending verification_.
- **Backend** Supabase Auth + `profiles` update (cannot change
  `is_platform_admin`).

---

# `apps/platform-admin` (isolated staff) — **IMPLEMENTED** (Phase 5M)

## Staff sign-in — `/sign-in`

- Isolated auth, email + password, no self-service sign-up. A signed-in
  non-staff account gets a "Not authorised" page. **MFA planned** before real
  data.

## Notification bell (global, in the app shell) — **IMPLEMENTED** (Phase 5N)

- Same component and backend as the family-portal bell (above), tailored for
  staff: `memorial_reported` items link to `/reports`, `service_request_received`
  items to `/service-requests` (no memorial detail route exists here).

## Overview — `/`

- **Sections** four count cards (memorials, suspended, open reports, new service
  requests), each linking through.
- **Backend** `getAdminCounts` — RLS-scoped counts across `memorials`,
  `reports`, `service_requests`.

## Memorials — `/memorials`

- **Sections** name search + list (name, status, canonical slug, suspension
  reason).
- **Actions** **Suspend** (with a reason prompt) / **Restore**.
- **Backend** [`setMemorialModeration`](../domain/operations/platform-moderation.md)
  — platform-only, audited (`actor_kind = platform_admin`); the
  `memorials_guard_lifecycle` trigger enforces staff-only suspension.

## Reports — `/reports`

- **Sections** the open queue (oldest first); toggle to show resolved.
- **Actions** Start review, Actioned, Dismiss — each with an optional resolution
  note; terminal statuses stamp `resolved_by` / `resolved_at`.
- **Backend** [`resolveReport`](../domain/operations/platform-moderation.md).
  Actioning a tribute report still needs a separate
  [`hideTribute`](./moderate-tribute.md).

## Service requests — `/service-requests`

- **Sections** queue (type, contact, status); toggle to show closed.
- **Actions** status select, Assign to me / Unassign me, Save note (internal
  notes, never shown to the requester).
- **Backend** [`updateServiceRequest`](../domain/operations/platform-moderation.md).

## Audit log — `/audit`

- **Sections** platform-wide `audit_logs`, filterable by memorial, actor,
  action, date.
- **Actions** filter, open the related entity.
- **Permissions** `is_platform_admin` (all rows).
- **Backend** read `audit_logs`.
- **States** _no results_ for a filter.

---

## Notes

- Every form: labels on all fields, errors associated (`aria-describedby`),
  input preserved on error, async results announced via `aria-live`
  ([../architecture/accessibility-architecture.md](../architecture/accessibility-architecture.md)).
- Every list: a real empty state (never a blank page), a skeleton loading state,
  and an error state with a retry.
- Destructive actions (delete memorial, transfer ownership, remove a member,
  suspend) always confirm and — for the most sensitive — re-authenticate.
- Analytics events are aggregate and privacy-first ([analytics.md](./analytics.md)).
