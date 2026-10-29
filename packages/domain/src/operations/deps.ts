import type { Clock } from "../clock";
import type { DomainEventBuffer } from "../events";
import type { IdGenerator } from "../id-generator";
import type { UnitOfWork } from "../ports/unit-of-work";

/**
 * Everything a core-memorial operation needs, injected by the transport.
 * Operations depend on these ports only — never on HTTP, cookies, React or
 * Next.js.
 */
/**
 * Verifies a bot-defence challenge token. The provider is **deferred** — a
 * transport that has no provider omits this and challenge verification is
 * skipped (documented; do not claim bot protection is complete). A real
 * adapter returns `false` for a missing / invalid token.
 */
export interface CaptchaVerifier {
  verify(token: string | undefined, action: string): Promise<boolean>;
}

export interface OperationDeps {
  unitOfWork: UnitOfWork;
  clock: Clock;
  ids: IdGenerator;
  /** Transport owns this and drains it *after* the transaction commits. */
  events: DomainEventBuffer;
  /** Optional bot-defence adapter (provider deferred; absent = not enforced). */
  captcha?: CaptchaVerifier;
}
