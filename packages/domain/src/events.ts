import type { DomainEventName } from "@evermora/types";

/** A domain event produced by an operation, ready to be dispatched. */
export interface DomainEvent<TPayload = Record<string, unknown>> {
  readonly name: DomainEventName;
  readonly occurredAt: string;
  readonly payload: TPayload;
}

/** Collects the events an operation wants emitted once it commits. */
export class DomainEventBuffer {
  private readonly events: DomainEvent[] = [];

  record<TPayload extends Record<string, unknown>>(name: DomainEventName, payload: TPayload): void {
    this.events.push({ name, payload, occurredAt: new Date().toISOString() });
  }

  drain(): DomainEvent[] {
    return this.events.splice(0, this.events.length);
  }

  get size(): number {
    return this.events.length;
  }
}
