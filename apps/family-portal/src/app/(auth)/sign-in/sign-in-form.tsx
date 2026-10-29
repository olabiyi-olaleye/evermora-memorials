"use client";

import { useActionState } from "react";
import { signInAction, type AuthActionState } from "@/lib/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/form";

const initial: AuthActionState = { error: null };

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signInAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError message={state.error} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <SubmitButton size="lg" className="mt-2 w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
