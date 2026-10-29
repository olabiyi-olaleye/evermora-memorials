"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  Button,
  Select,
  StatusBadge,
  Textarea,
} from "@evermora/ui";
import { SERVICE_REQUEST_STATUS, type ServiceRequestStatus } from "@evermora/types";
import type { AdminServiceRequest } from "@/lib/data/admin";
import { SERVICE_STATUS_LABEL, SERVICE_TYPE_LABEL, TERMINAL_SERVICE_STATUS } from "@/lib/labels";
import { updateServiceRequestAction } from "@/lib/actions/moderation";

export function ServiceRequestRow({
  request: r,
  meId,
}: {
  request: AdminServiceRequest;
  meId: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState(r.internalNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendingTerminal, setPendingTerminal] = useState<ServiceRequestStatus | null>(null);
  const [pending, start] = useTransition();
  const mine = r.assignedTo === meId;

  function act(input: Parameters<typeof updateServiceRequestAction>[0]) {
    setError(null);
    start(async () => {
      const res = await updateServiceRequestAction(input);
      if (res.ok) {
        setPendingTerminal(null);
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  }

  function onStatusChange(next: ServiceRequestStatus) {
    if (next === r.status) return;
    if (TERMINAL_SERVICE_STATUS.includes(next)) {
      setPendingTerminal(next);
      return;
    }
    act({ requestId: r.id, status: next });
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-5 text-sm shadow-e1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-fg">
          {SERVICE_TYPE_LABEL[r.serviceType] ?? r.serviceType}
        </span>
        <span className="text-[12.5px] text-fg-muted">
          {r.contactName} · {r.contactEmail}
          {r.contactPhone ? ` · ${r.contactPhone}` : ""}
        </span>
        <span className="ml-auto">
          <StatusBadge status={r.status} label={SERVICE_STATUS_LABEL[r.status]} />
        </span>
      </div>
      {r.memorialName ? (
        <p className="text-[12.5px] text-fg-subtle">Memorial: {r.memorialName}</p>
      ) : null}
      {r.details ? <p className="text-fg-muted">{r.details}</p> : null}

      <Textarea
        rows={2}
        placeholder="Internal notes (never shown to the requester)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error ? <p className="text-[12.5px] text-bad">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Select
          selectSize="sm"
          aria-label="Status"
          className="w-auto"
          value={r.status}
          disabled={pending}
          onChange={(e) => onStatusChange(e.target.value as ServiceRequestStatus)}
        >
          {SERVICE_REQUEST_STATUS.map((s) => (
            <option key={s} value={s}>
              {SERVICE_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        {mine ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => act({ requestId: r.id, unassign: true })}
            disabled={pending}
          >
            Unassign me
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => act({ requestId: r.id, assignToMe: true })}
            disabled={pending}
          >
            Assign to me
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => act({ requestId: r.id, internalNote: note.trim() })}
          disabled={pending || note === (r.internalNotes ?? "")}
        >
          Save note
        </Button>
      </div>

      <AlertDialog
        open={pendingTerminal !== null}
        onOpenChange={(o) => !o && setPendingTerminal(null)}
      >
        <AlertDialogContent
          title={`Mark this request "${pendingTerminal ? SERVICE_STATUS_LABEL[pendingTerminal] : ""}"?`}
          description="This closes the request. You can still see it under 'Show all'."
          confirmLabel="Confirm"
          tone="danger"
          onConfirm={() => pendingTerminal && act({ requestId: r.id, status: pendingTerminal })}
        />
      </AlertDialog>
    </li>
  );
}
