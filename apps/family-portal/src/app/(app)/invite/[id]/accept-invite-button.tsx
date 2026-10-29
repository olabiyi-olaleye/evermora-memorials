"use client";

import { useState, useTransition } from "react";
import { Button } from "@evermora/ui";
import { FormError } from "@/components/form";
import { acceptMemorialInviteAction } from "@/lib/actions/family";

export function AcceptInviteButton({ membershipId }: { membershipId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-center gap-2">
      <FormError message={error} />
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await acceptMemorialInviteAction(membershipId);
            // success redirects; only a failure returns here
            if (res && !res.ok) setError(res.error.message);
          })
        }
      >
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
    </div>
  );
}
