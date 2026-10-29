import { Badge } from "@evermora/ui";
import { formatMemorialDate } from "@evermora/utils";
import type { PublicFamilyUpdate } from "@/lib/memorial";

export function FamilyUpdates({ updates }: { updates: PublicFamilyUpdate[] }) {
  if (updates.length === 0) return null;

  return (
    <section className="mt-16 border-t border-accent/25 pt-10 sm:mt-20 sm:pt-14">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">Updates</p>
      <h2 className="mt-3 font-serif text-[clamp(1.5rem,1.2rem+1.1vw,2rem)] text-fg">
        From the family
      </h2>

      <ul className="mt-8 flex max-w-2xl flex-col gap-8">
        {updates.map((u) => (
          <li key={u.id} className="border-l-2 border-line pl-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="font-serif text-lg text-fg">{u.title}</h3>
              {u.importance !== "normal" ? (
                <Badge tone="warn" withDot>
                  {u.importance === "urgent" ? "Urgent" : "Important"}
                </Badge>
              ) : null}
              {u.publishedAt ? (
                <span className="font-mono text-xs text-fg-subtle">
                  {formatMemorialDate(u.publishedAt)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 leading-[1.7] whitespace-pre-line text-fg-muted">{u.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
