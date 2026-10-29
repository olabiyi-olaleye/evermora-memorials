import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Button — five variants, one weight, three sizes (the one sizing rule:
 * sm 36 / md 44 / lg 48). Filled evergreen (`primary`) is the dominant action
 * of an interaction context; `danger` is unmistakable. Every variant has a
 * visible focus ring and a loading state that also disables the control.
 */
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold",
    "rounded-sm border border-transparent transition-colors select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-brand text-on-brand shadow-e1 hover:bg-brand-hover",
        secondary: "border-line-strong bg-surface text-fg hover:bg-surface-subtle",
        ghost: "text-fg-muted hover:bg-surface-subtle hover:text-fg",
        danger: "bg-bad text-white hover:bg-[#8f322b]",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px] [&_svg]:size-3.5",
        md: "h-11 px-[18px] text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-[15px] [&_svg]:size-[18px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. an `<a>` or `<Link>`), keeping button styling. */
  asChild?: boolean;
  /** Show a spinner and disable the control. */
  loading?: boolean;
  /** Icon before the label. */
  leadingIcon?: ReactNode;
  /** Icon after the label. */
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    leadingIcon,
    trailingIcon,
    children,
    type,
    disabled,
    ...props
  },
  ref,
) {
  // `asChild` forwards styling onto the caller's single element (a link, usually).
  // Slot requires exactly one child, so icon/spinner injection is skipped — put
  // any icon inside the child element itself.
  if (asChild) {
    return (
      <Slot
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        aria-busy={loading || undefined}
        {...props}
      >
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});

/* -------------------------------------------------------------------------- */

export interface IconButtonProps extends Omit<
  ButtonProps,
  "leadingIcon" | "trailingIcon" | "children"
> {
  /** Required — icon buttons have no visible text. */
  "aria-label": string;
  children: ReactNode;
}

/** A square button for a single icon. Always needs an `aria-label`. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, size = "md", variant = "secondary", children, loading, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      loading={loading}
      className={cn(
        "aspect-square p-0",
        size === "sm" && "h-9 w-9",
        size === "md" && "h-11 w-11",
        size === "lg" && "h-12 w-12",
        className,
      )}
      {...props}
    >
      {!loading && children}
    </Button>
  );
});
