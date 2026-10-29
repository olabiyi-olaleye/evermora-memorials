"use client";

import * as RCheckbox from "@radix-ui/react-checkbox";
import * as RRadio from "@radix-ui/react-radio-group";
import * as RSwitch from "@radix-ui/react-switch";
import { Check } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "./cn";

/* ---------------- Checkbox ---------------- */

export interface CheckboxProps extends RCheckbox.CheckboxProps {
  label?: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { className, label, description, id, ...props },
  ref,
) {
  const box = (
    <RCheckbox.Root
      ref={ref}
      id={id}
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-xs border-[1.5px] border-line-strong bg-raised transition-colors",
        "data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-white",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RCheckbox.Indicator>
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </RCheckbox.Indicator>
    </RCheckbox.Root>
  );
  if (!label) return box;
  return (
    <div className="flex items-start gap-2.5">
      {box}
      <div className="grid gap-0.5">
        <label htmlFor={id} className="text-sm text-fg">
          {label}
        </label>
        {description ? <p className="text-[12.5px] text-fg-subtle">{description}</p> : null}
      </div>
    </div>
  );
});

/* ---------------- Radio ---------------- */

export const RadioGroup = RRadio.Root;

export interface RadioProps extends RRadio.RadioGroupItemProps {
  label?: ReactNode;
  description?: ReactNode;
}

export const Radio = forwardRef<HTMLButtonElement, RadioProps>(function Radio(
  { className, label, description, id, ...props },
  ref,
) {
  const dot = (
    <RRadio.Item
      ref={ref}
      id={id}
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-line-strong bg-raised transition-colors",
        "data-[state=checked]:border-brand data-[state=checked]:bg-brand",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RRadio.Indicator className="block size-[7px] rounded-full bg-white" />
    </RRadio.Item>
  );
  if (!label) return dot;
  return (
    <div className="flex items-start gap-2.5">
      {dot}
      <div className="grid gap-0.5">
        <label htmlFor={id} className="text-sm text-fg">
          {label}
        </label>
        {description ? <p className="text-[12.5px] text-fg-subtle">{description}</p> : null}
      </div>
    </div>
  );
});

/* ---------------- Switch ---------------- */

export interface SwitchProps extends RSwitch.SwitchProps {
  label?: ReactNode;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { className, label, id, ...props },
  ref,
) {
  const track = (
    <RSwitch.Root
      ref={ref}
      id={id}
      className={cn(
        "relative h-[22px] w-[38px] shrink-0 rounded-full bg-line-strong transition-colors",
        "data-[state=checked]:bg-brand",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RSwitch.Thumb className="block size-4 translate-x-[3px] rounded-full bg-white shadow-e1 transition-transform data-[state=checked]:translate-x-[19px]" />
    </RSwitch.Root>
  );
  if (!label) return track;
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 text-sm text-fg">
      {track}
      {label}
    </label>
  );
});
