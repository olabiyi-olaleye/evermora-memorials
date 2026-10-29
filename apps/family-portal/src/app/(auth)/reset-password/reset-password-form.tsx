"use client";

import { useActionState } from "react";
import { updatePasswordAction, type AuthActionState } from "@/lib/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/form";

const initial: AuthActionState = { error: null };

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
      />
      <Field
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <SubmitButton size="lg" className="mt-2 w-full">
        Save new password
      </SubmitButton>
    </form>
  );
}
