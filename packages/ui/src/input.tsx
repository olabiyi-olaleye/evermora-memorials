import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Input / Textarea — the one sizing rule (sm 36 / md 44 / lg 48), a 2px
 * evergreen focus ring, and an error state driven by `aria-invalid`. Never
 * styled below 16px so mobile Safari doesn't zoom on focus.
 */
const fieldBase = cva(
  [
    "w-full rounded-sm border bg-raised text-fg placeholder:text-fg-subtle",
    "border-line-strong transition-colors",
    "focus:outline-2 focus:outline-offset-1 focus:outline-brand focus:border-brand",
    "disabled:cursor-not-allowed disabled:opacity-55 disabled:bg-surface-subtle",
    "aria-[invalid=true]:border-bad aria-[invalid=true]:focus:outline-bad",
  ],
  {
    variants: {
      inputSize: {
        sm: "h-9 px-3 text-[15px]",
        md: "h-11 px-3.5 text-base",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: { inputSize: "md" },
  },
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">, VariantProps<typeof fieldBase> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, inputSize, type = "text", ...props },
  ref,
) {
  return (
    <input ref={ref} type={type} className={cn(fieldBase({ inputSize }), className)} {...props} />
  );
});

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>, VariantProps<typeof fieldBase> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, inputSize, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        fieldBase({ inputSize }),
        "min-h-[5.5rem] resize-y py-2.5 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
});
