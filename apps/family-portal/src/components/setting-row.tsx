"use client";

import { useId, type ReactNode } from "react";
import { cn, Switch } from "@evermora/ui";

/**
 * One switch setting — label + explanation on the left, the toggle on the
 * right. Reads as a setting, not a form field.
 */
export function SettingRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-line py-4 last:border-0",
        disabled && "opacity-55",
      )}
    >
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 max-w-prose text-[13px] leading-relaxed text-fg-subtle">
            {description}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-0.5"
      />
    </div>
  );
}
