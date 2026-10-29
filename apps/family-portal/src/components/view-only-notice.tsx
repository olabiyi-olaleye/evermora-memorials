import type { ReactNode } from "react";
import { Eye } from "lucide-react";

/** Shown to members without edit access on a section they can only read. */
export function ViewOnlyNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-md border border-line bg-surface px-4 py-3 text-sm text-fg-muted">
      <Eye aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
      <span>
        {children ?? "You have view-only access to this memorial, so you can't make changes here."}
      </span>
    </p>
  );
}
