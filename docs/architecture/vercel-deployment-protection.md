# Vercel Deployment Protection

Status of Vercel **Deployment Protection** for the three apps while they contain
only placeholder / foundation code.

| App            | Vercel project    | Now                                     | Before real functionality                                                                                         |
| -------------- | ----------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Public site    | `evermora-web`    | may remain publicly reachable           | stays public (it is the public surface)                                                                           |
| Family portal  | `evermora-family` | may remain reachable (placeholder only) | **re-enable** protection / gate before any authenticated family data or flows ship                                |
| Platform admin | `evermora-admin`  | treat as internal / sensitive           | **must** have Vercel Deployment Protection (or equivalent) re-enabled before any real admin functionality or data |

## Rules

- Vercel Deployment Protection is **infrastructure hardening, not application
  auth.** It never substitutes for Evermora's own authentication and
  authorization. `admin.evermora.com` still requires a fully isolated
  application login + platform-admin authorization regardless of Vercel
  protection ([session-isolation.md](./session-isolation.md),
  [authorization-architecture.md](./authorization-architecture.md)).
- Preview deployments of `evermora-admin` should not be world-open once the app
  is more than a placeholder.
- This decision is revisited at the start of platform-admin feature work and
  tracked in [security-architecture.md](./security-architecture.md).
