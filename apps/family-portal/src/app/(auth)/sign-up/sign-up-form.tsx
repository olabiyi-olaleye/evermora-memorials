"use client";

import { useActionState } from "react";
import { signUpAction, type AuthActionState } from "@/lib/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/form";

const initial: AuthActionState = { error: null };

export function SignUpForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signUpAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError message={state.error} />
      <Field label="Your name" name="displayName" autoComplete="name" required />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <SubmitButton size="lg" className="mt-2 w-full">
        Create account
      </SubmitButton>
    </form>
  );
}
