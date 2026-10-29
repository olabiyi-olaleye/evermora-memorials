"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@evermora/ui";
import { publishMemorialAction } from "@/lib/actions/memorials";

export function PublishButton({ memorialId }: { memorialId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await publishMemorialAction(memorialId);
            if (res.ok) router.refresh();
            else setError(res.error.message);
          })
        }
      >
        Publish memorial
      </Button>
      {error ? (
        <p role="alert" className="max-w-xs text-right text-xs text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
