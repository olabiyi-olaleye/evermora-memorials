"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type AuthActionState } from "@/lib/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/form";

const initial: AuthActionState = { error: null };

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initial);

  if (state.sent) {
    return (
      <p
        role="status"
        className="rounded-md border border-line bg-surface-subtle px-3 py-3 text-sm text-fg-muted"
      >
        If there is an account for that email, a reset link is on its way.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <SubmitButton size="lg" className="mt-2 w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}
