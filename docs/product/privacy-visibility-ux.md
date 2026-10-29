# Privacy & visibility — UX

How a family controls who sees what, in plain language. The model is
[../architecture/privacy-architecture.md](../architecture/privacy-architecture.md);
this is the product surface.

## Two separate questions (never conflated)

1. **Who can open this memorial?** → _visibility_
2. **Can search engines list it?** → _search indexing_ (a separate toggle,
   default **off**)

> A public URL is **not** automatically on Google. That is a deliberate second
> choice.

## Memorial visibility

| Setting             | Plain-language label                 | Meaning                                                      |
| ------------------- | ------------------------------------ | ------------------------------------------------------------ |
| `private` (default) | **Private** — only people you invite | not reachable by URL; members & platform staff only          |
| `anyone_with_link`  | **Anyone with the link**             | opens for anyone who has the URL; not listed anywhere        |
| `public`            | **Public**                           | opens for anyone; may appear in an Evermora listing (future) |

`anyone_with_link` and `public` open identically for a direct visit — the slug
_is_ the key. The difference is discoverability.

## Search indexing toggle

- Label: **"Allow search engines to list this memorial"** — off by default.
- Only meaningful when visibility is `anyone_with_link` or `public`.
- On → the public page drops `noindex` and appears in `sitemap.xml`.
- Off → the URL still works when shared; search engines are asked not to list
  it.

## Per-section privacy

Each section has its own visibility, defaulting sensibly:

| Section                             | Default for non-members      | Typical family choice         |
| ----------------------------------- | ---------------------------- | ----------------------------- |
| Life story                          | inherits memorial visibility | usually public                |
| Photo gallery                       | inherits                     | usually public                |
| Funeral events                      | inherits                     | public (so people can attend) |
| Family updates                      | inherits                     | public                        |
| **Family details / related people** | **members only**             | opened deliberately           |
| **Burial / resting place**          | **members only**             | often kept members-only       |
| Documents                           | members only                 | members-only                  |

Values: **Inherit** (follow the memorial) · **Public** · **Members only** ·
**Private** (only editors).

## UX rules

- The Privacy screen shows a **live summary sentence**: _"Anyone with the link
  can view this memorial. It won't appear in search results. Burial location is
  hidden from the public."_
- Turning a section **public** on a published memorial shows a confirmation
  ("This will be visible to everyone who can open the memorial.").
- Turning the memorial **private** is always allowed with no friction (tightening
  is safe); the public URL stops resolving immediately.
- Draft memorials are never public regardless of the visibility value — publish
  is the separate gate.
- A **suspended** memorial is hidden from everyone but members/staff regardless
  of settings (platform action).
- The public page **never** hints that hidden content exists ("Burial details
  are private" is fine; showing a locked row with a teaser is not).

## What visitors can tell

- Nothing about who else has viewed, who the members are, or that a section is
  hidden beyond a neutral "this is private to the family".
- Approved tributes show the author's chosen display name and relationship —
  **never** their email.

## Related

[flows/memorial-creation.md](./flows/memorial-creation.md) step 7 ·
[screen-inventory.md](./screen-inventory.md) → Privacy / Features ·
[../architecture/feature-settings-architecture.md](../architecture/feature-settings-architecture.md)
(features answer "is it available?", privacy answers "who sees it?").
