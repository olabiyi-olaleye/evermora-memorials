# User flows

End-to-end journeys. Each flow file follows: **actor · preconditions · steps
(screen → action → system) · events · edge cases · principles touched**.

Screens are in [screen-inventory.md](./screen-inventory.md); the operations each
step invokes are in [../domain/operations/](../domain/operations/).

## Index

| Flow                                                               | Actor                             | Summary                                                      |
| ------------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------ |
| [memorial-creation.md](./flows/memorial-creation.md)               | family (owner)                    | sign in → wizard → draft → publish                           |
| [visitor.md](./flows/visitor.md)                                   | anonymous visitor                 | arrive → read → tribute / candle / report — no account       |
| [tribute-moderation.md](./flows/tribute-moderation.md)             | owner / admin / tribute_moderator | review queue → approve / reject / hide                       |
| [funeral-management.md](./flows/funeral-management.md)             | owner / admin / content_editor    | add events → publish → update / cancel                       |
| [service-request.md](./flows/service-request.md)                   | anyone                            | submit an enquiry → staff triage                             |
| [platform-admin.md](./flows/platform-admin.md)                     | platform staff                    | report → investigate → hide / suspend / resolve              |
| [family-access-invitation.md](./flows/family-access-invitation.md) | owner / admin ↔ invitee           | invite → accept → role changes → ownership transfer          |
| [sharing-qr.md](./flows/sharing-qr.md)                             | family + visitor                  | share link / QR → visitor lands on the current canonical URL |
| [post-funeral-legacy.md](./flows/post-funeral-legacy.md)           | family                            | after the service: thanksgiving, updates, archive, keep      |

## Shared conventions

- **No public draft URL.** Everything pre-publish happens inside
  `family.evermora.com` ([../architecture/session-isolation.md](../architecture/session-isolation.md)).
- **Moderation default is on.** A submitted tribute is `pending` until a
  moderator acts; the visitor is told so.
- **Funeral information never blocks publication.** The memorial can be
  published with zero funeral events.
- **Every consequential step** writes an `audit_logs` row (in the same
  transaction) and may record a domain/notification event
  ([../domain/events.md](../domain/events.md)).
- **RLS is always underneath.** Even if a UI step is skipped or a domain check
  regresses, the database rejects an unauthorized write.
- **Respectful failure.** A private/missing memorial shows "not available",
  never a login wall or a 403 that confirms it exists.
