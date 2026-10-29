import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  selectSize?: "sm" | "md" | "lg";
}

/**
 * Select — a styled native `<select>` (keeps the OS picker, which is the right
 * call on mobile). Chevron is decorative; the control is the real element.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, selectSize = "md", children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "w-full appearance-none rounded-sm border border-line-strong bg-raised text-fg",
          "pr-9 transition-colors",
          "focus:outline-2 focus:outline-offset-1 focus:outline-brand focus:border-brand",
          "disabled:cursor-not-allowed disabled:opacity-55 disabled:bg-surface-subtle",
          "aria-[invalid=true]:border-bad",
          selectSize === "sm" && "h-9 pl-3 text-[15px]",
          selectSize === "md" && "h-11 pl-3.5 text-base",
          selectSize === "lg" && "h-12 pl-4 text-base",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-subtle"
        aria-hidden
      />
    </div>
  );
});
