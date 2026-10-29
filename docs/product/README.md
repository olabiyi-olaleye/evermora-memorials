# Product documentation

What Evermora is, who it is for, and how it behaves — from the user's side.
Transport-independent business rules live in [`../domain/`](../domain/); the
technical architecture in [`../architecture/`](../architecture/).

Status legend: **LOCKED** (approved) · **MVP** (in scope for the first release)
· **FUTURE** (out of MVP scope). Nothing here is implemented yet — the three
apps are placeholder surfaces (see
[../architecture/system-architecture.md](../architecture/system-architecture.md)).

## Index

| Document                                                     | Purpose                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| [prd.md](./prd.md)                                           | vision, principles, audiences, problem, success measures                                                |
| [mvp-scope.md](./mvp-scope.md)                               | what ships in v1 vs what is explicitly deferred                                                         |
| [roles.md](./roles.md)                                       | every actor: visitor, family roles, platform staff                                                      |
| [permission-matrix.md](./permission-matrix.md)               | role × permission, aligned to the DB and domain                                                         |
| [information-architecture.md](./information-architecture.md) | the three apps, their route maps, navigation                                                            |
| [screen-inventory.md](./screen-inventory.md)                 | every significant screen: purpose, sections, fields, states, permissions, analytics                     |
| [user-flows.md](./user-flows.md)                             | index + shared conventions for the end-to-end flows                                                     |
| [flows/](./flows/)                                           | one document per flow (creation, visitor, moderation, funeral, service, admin, access, sharing, legacy) |
| [privacy-visibility-ux.md](./privacy-visibility-ux.md)       | how families control who sees what — the UX of privacy                                                  |
| [analytics.md](./analytics.md)                               | the product analytics event model (privacy-first)                                                       |
| [future-scope.md](./future-scope.md)                         | billing, marketplace, i18n, and other post-MVP product areas                                            |

## Evermora in one paragraph

Evermora is a mobile-first Progressive Web App for creating and sharing online
memorials: a public biography, life stories, a photo gallery, moderated visitor
tributes, structured funeral information, and official family updates — plus a
private family dashboard to manage all of it and an internal admin surface for
platform operations. It is **family-controlled, respectful, privacy-conscious,
and free of social-media mechanics**. Visitors generally need no account, and
funeral information never blocks memorial publication.
