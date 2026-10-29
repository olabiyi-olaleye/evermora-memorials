"use client";

import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import { Button, type ButtonProps, FormField, Input } from "@evermora/ui";

export function Field({
  label,
  name,
  type = "text",
  required,
  autoComplete,
  defaultValue,
  hint,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  hint?: string;
  minLength?: number;
}) {
  return (
    <FormField label={label} description={hint} required={required}>
      <Input
        id={`f-${name}`}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        minLength={minLength}
      />
    </FormField>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-bad/40 bg-bad-soft px-3 py-2 text-sm text-bad"
    >
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {children}
    </Button>
  );
}
