"use client";

import * as RToast from "@radix-ui/react-toast";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { IconButton } from "./button";
import { cn } from "./cn";

type ToastTone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  title: ReactNode;
  description?: ReactNode;
  tone: ToastTone;
}

interface ToastApi {
  toast: (t: { title: ReactNode; description?: ReactNode; tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Confirms an action after it happens — "Published", "Link copied". Wrap the app once. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback<ToastApi["toast"]>(({ title, description, tone = "success" }) => {
    setItems((prev) => [...prev, { id: Date.now() + Math.random(), title, description, tone }]);
  }, []);
  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      <RToast.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((t) => (
          <RToast.Root
            key={t.id}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((x) => x.id !== t.id));
            }}
            className={cn(
              "flex items-start gap-2.5 rounded-md border border-line bg-raised p-3.5 shadow-e2",
              "border-l-[3px]",
              t.tone === "success" && "border-l-ok",
              t.tone === "error" && "border-l-bad",
              t.tone === "warning" && "border-l-warn",
              t.tone === "info" && "border-l-info",
              "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            )}
          >
            <ToneIcon tone={t.tone} />
            <div className="min-w-0 flex-1">
              <RToast.Title className="text-sm font-semibold text-fg">{t.title}</RToast.Title>
              {t.description ? (
                <RToast.Description className="mt-0.5 text-[13px] text-fg-muted">
                  {t.description}
                </RToast.Description>
              ) : null}
            </div>
            <RToast.Close asChild>
              <IconButton aria-label="Dismiss" variant="ghost" size="sm" className="-mt-1 -mr-1">
                <X aria-hidden />
              </IconButton>
            </RToast.Close>
          </RToast.Root>
        ))}
        <RToast.Viewport className="fixed right-4 bottom-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 outline-none" />
      </RToast.Provider>
    </ToastContext.Provider>
  );
}

function ToneIcon({ tone }: { tone: ToastTone }) {
  const cls = "mt-px size-[17px] shrink-0";
  if (tone === "success") return <CheckCircle2 className={cn(cls, "text-ok")} aria-hidden />;
  if (tone === "error") return <XCircle className={cn(cls, "text-bad")} aria-hidden />;
  if (tone === "warning") return <AlertTriangle className={cn(cls, "text-warn")} aria-hidden />;
  return <Info className={cn(cls, "text-info")} aria-hidden />;
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
