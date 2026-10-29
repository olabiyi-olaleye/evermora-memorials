"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { IconButton } from "./button";
import { Dialog, DialogClose, DialogTrigger, DrawerContent } from "./dialog";
import { Topbar } from "./shell";
import { ToastProvider } from "./toast";
import { TooltipProvider } from "./tooltip";

/**
 * AppShell — the family / admin application frame. A persistent `Sidebar` on
 * `lg+`; the same nav content inside a left `Drawer` below `lg`, opened from
 * the topbar's menu button. The content region fills its width (no centred
 * sub-column) up to whatever `Container` the page chooses.
 */
export interface AppShellProps {
  /** The desktop sidebar (a `<Sidebar>`). */
  sidebar: ReactNode;
  /** The same nav content for the mobile drawer. Defaults to `sidebar`. */
  drawer?: ReactNode;
  /** Accessible label for the drawer. */
  drawerLabel?: string;
  /** Topbar contents — breadcrumb / context and right-side actions. */
  topbar?: { brand?: ReactNode; actions?: ReactNode };
  children: ReactNode;
}

export function AppShell({
  sidebar,
  drawer,
  drawerLabel = "Menu",
  topbar,
  children,
}: AppShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <ToastProvider>
      <TooltipProvider>
        <AppShellFrame
          open={open}
          setOpen={setOpen}
          sidebar={sidebar}
          drawer={drawer}
          drawerLabel={drawerLabel}
          topbar={topbar}
        >
          {children}
        </AppShellFrame>
      </TooltipProvider>
    </ToastProvider>
  );
}

function AppShellFrame({
  open,
  setOpen,
  sidebar,
  drawer,
  drawerLabel = "Menu",
  topbar,
  children,
}: AppShellProps & { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <div className="flex min-h-full flex-1">
      <div className="hidden lg:flex">{sidebar}</div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Dialog open={open} onOpenChange={setOpen}>
          <Topbar
            menu={
              <DialogTrigger asChild>
                <IconButton aria-label="Open menu" variant="ghost" size="sm">
                  <Menu aria-hidden />
                </IconButton>
              </DialogTrigger>
            }
            brand={topbar?.brand}
            actions={topbar?.actions}
          />
          <DrawerContent title={drawerLabel} side="left" bare className="w-[min(17rem,85vw)]">
            <DialogClose asChild>
              <IconButton
                aria-label="Close menu"
                variant="ghost"
                size="sm"
                className="absolute top-2.5 right-2.5 z-10"
              >
                <X aria-hidden />
              </IconButton>
            </DialogClose>
            <div
              className="flex h-full min-h-0 flex-col"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) setOpen(false);
              }}
            >
              {drawer ?? sidebar}
            </div>
          </DrawerContent>
        </Dialog>

        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
