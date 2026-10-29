# Evermora — Product Requirements

## Vision

A calm, lasting place to remember someone — that a grieving family can create in
an afternoon, share in a WhatsApp message, and keep for years.

## The problem

When someone dies, families improvise: a Facebook post that scrolls away, a
WhatsApp broadcast with the funeral address that gets forwarded and garbled, a
printed programme that's gone the next week. There is no single, dignified,
durable place that holds the person's story, the funeral details, and the
messages people want to leave — under the family's control, without ads or
engagement mechanics, and without forcing every mourner to make an account.

## Principles (LOCKED)

1. **Family-controlled.** The family decides what exists, what is visible, and
   who can help. Nothing is published or exposed without their action.
2. **Respectful & timeless.** The public memorial is editorial and quiet — never
   a SaaS dashboard, never gamified. No "likes", no view-count flexing, no
   streaks.
3. **Privacy-conscious.** Private by default. Visibility and search indexing are
   separate, deliberate choices. Section-level privacy (family details, burial
   location) is respected even after publication.
4. **Mobile-first.** Designed for a mid-range phone on a slow network, arriving
   from a forwarded link.
5. **No grief exploitation.** No dark patterns, no upsell in a moment of loss,
   no data brokering, no invasive visitor tracking.
6. **Visitors don't need accounts** to view a memorial, read tributes, see
   funeral information, or leave a tribute where the family allows it.
7. **Funeral information must not block memorial publication.** A family can
   publish the memorial immediately and add or confirm funeral details over the
   following days. Memorial lifecycle and funeral-planning status are
   independent.

## Audiences

| Audience                         | Needs                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **The family** (owner + helpers) | create quickly under stress; control visibility; moderate tributes; publish and update funeral details; invite relatives to help; share widely |
| **Visitors / mourners**          | find the memorial from a link or QR; read the story; see when/where the service is; leave a message; light a candle — all without signing up   |
| **Extended family abroad**       | follow updates, attend a livestream, contribute a photo or memory                                                                              |
| **Evermora platform staff**      | investigate abuse reports, handle service requests, suspend content that violates policy, support families                                     |

## What Evermora is **not**

- Not a social network. No feeds, followers, reactions, DMs, or discovery
  algorithm.
- Not a genealogy / records product.
- Not a general CMS — it models memorials specifically (architecture spec §29).
- Not a funeral-home booking platform (service **requests** are captured and
  routed; fulfilment is a separate, later concern).

## MVP outcome

A family can: sign in → create a memorial → add a portrait, story, and photos →
set visibility → publish at `evermora.com/{slug}` → add funeral events and
publish them → invite a relative to help moderate → share the link / a QR →
approve incoming tributes → post an official update → archive the memorial
later. A visitor can do everything in the [visitor flow](./flows/visitor.md)
with no account.

## Success measures (product)

- **Time to publish** — a family reaches a published memorial in one sitting.
- **Activation** — a meaningful share of created memorials get published and
  shared.
- **Visitor usefulness** — visitors view the funeral event and/or leave a
  tribute (the reason the family made it).
- **Moderation load** — tributes are approvable quickly; spam is contained.
- **Trust** — near-zero privacy incidents; abuse reports handled promptly.

Measured via the privacy-first [analytics model](./analytics.md) — aggregate,
non-invasive.

## Constraints (from architecture)

- Development Supabase only; staging/production deferred
  ([../architecture/environment-strategy.md](../architecture/environment-strategy.md)).
- Email provider, image-transformation provider, payments — all deferred.
- Custom domains not yet configured.
- The apps are placeholder surfaces today.
