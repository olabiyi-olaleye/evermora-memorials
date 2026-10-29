"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FormField,
  IconButton,
  StatusBadge,
  Td,
  Textarea,
  Tr,
} from "@evermora/ui";
import type { AdminMemorial } from "@/lib/data/admin";
import { setMemorialModerationAction } from "@/lib/actions/moderation";

export function MemorialRow({ memorial: m }: { memorial: AdminMemorial }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function act(input: Parameters<typeof setMemorialModerationAction>[0]) {
    setError(null);
    start(async () => {
      const res = await setMemorialModerationAction(input);
      if (res.ok) {
        setSuspendOpen(false);
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <Tr>
      <Td>
        <div className="min-w-0">
          <p className="font-medium text-fg">{m.fullName}</p>
          {m.slug ? (
            <p className="font-mono text-[11.5px] text-fg-subtle">evermora.com/{m.slug}</p>
          ) : (
            <p className="text-[11.5px] text-fg-subtle">No address</p>
          )}
          {m.status === "suspended" && m.suspendedReason ? (
            <p className="mt-0.5 text-[11.5px] text-bad">{m.suspendedReason}</p>
          ) : null}
          {error ? <p className="mt-0.5 text-[11.5px] text-bad">{error}</p> : null}
        </div>
      </Td>
      <Td>
        <StatusBadge status={m.status} />
      </Td>
      <Td className="font-mono text-[11.5px] whitespace-nowrap text-fg-subtle">
        {new Date(m.createdAt).toLocaleDateString()}
      </Td>
      <Td className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton aria-label={`Actions for ${m.fullName}`} variant="ghost" size="sm">
              <MoreHorizontal aria-hidden />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {m.slug ? (
              <DropdownMenuItem asChild>
                <a
                  href={`${process.env.NEXT_PUBLIC_APP_URL}/${m.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View public page
                </a>
              </DropdownMenuItem>
            ) : null}
            {m.status === "suspended" ? (
              <DropdownMenuItem onSelect={() => act({ memorialId: m.id, action: "restore" })}>
                Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem destructive onSelect={() => setSuspendOpen(true)}>
                Suspend…
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
          <DialogContent
            title={`Suspend "${m.fullName}"?`}
            description="The memorial goes offline immediately. Members and staff can still see it."
            footer={
              <>
                <DialogClose asChild>
                  <Button variant="ghost" size="sm">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant="danger"
                  size="sm"
                  loading={pending}
                  onClick={() =>
                    act({
                      memorialId: m.id,
                      action: "suspend",
                      reason: reason.trim() || undefined,
                    })
                  }
                >
                  Suspend
                </Button>
              </>
            }
          >
            <FormField
              label="Reason (shown to the family)"
              description="Optional, but recommended."
            >
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
              />
            </FormField>
          </DialogContent>
        </Dialog>
      </Td>
    </Tr>
  );
}
