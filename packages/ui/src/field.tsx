import { AlertCircle } from "lucide-react";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "./cn";

export interface FormFieldProps {
  label: ReactNode;
  /** The single control (Input, Textarea, Select, …). Its id/aria are wired for you. */
  children: ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean | "true" | "false";
    required?: boolean;
  }>;
  /** Helper text under the label. */
  description?: ReactNode;
  /** Validation message — shown, announced, and switches the control to its error state. */
  error?: ReactNode;
  required?: boolean;
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
  className?: string;
}

/**
 * FormField — one label, one control, optional hint, optional error. Handles
 * the `id` / `aria-describedby` / `aria-invalid` wiring so every field is
 * correctly associated without the caller thinking about it.
 */
export function FormField({
  label,
  children,
  description,
  error,
  required,
  hideLabel,
  className,
}: FormFieldProps) {
  const id = useId();
  const descId = description ? `${id}-desc` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;

  const control =
    isValidElement(children) &&
    cloneElement(children, {
      id: children.props.id ?? id,
      "aria-describedby":
        [children.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
      "aria-invalid": error ? true : children.props["aria-invalid"],
      required: required ?? children.props.required,
    });

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={children.props.id ?? id}
        className={cn("text-[13.5px] font-semibold text-fg", hideLabel && "sr-only")}
      >
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </label>
      {description ? (
        <p id={descId} className="text-[12.5px] text-fg-subtle">
          {description}
        </p>
      ) : null}
      {control}
      {error ? (
        <p id={errId} className="flex items-start gap-1.5 text-[12.5px] text-bad">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
