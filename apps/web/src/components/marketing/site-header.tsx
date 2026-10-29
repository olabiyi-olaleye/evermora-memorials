"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Button,
  cn,
  Dialog,
  DialogClose,
  DialogTrigger,
  DrawerContent,
  IconButton,
} from "@evermora/ui";
import { CTA, PRIMARY_NAV, SITE_NAME } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200",
        scrolled
          ? "border-line bg-canvas/85 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-6">
        <Link
          href="/"
          className="font-serif text-lg font-medium tracking-tight text-fg transition-colors hover:text-brand"
        >
          {SITE_NAME}
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 md:flex">
          {PRIMARY_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "text-brand" : "text-fg-muted hover:bg-surface-subtle hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <a href={CTA.signIn}>Sign in</a>
          </Button>
          <Button asChild size="sm">
            <a href={CTA.create}>Create a memorial</a>
          </Button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <IconButton
              aria-label="Open menu"
              variant="ghost"
              size="sm"
              className="ml-auto md:hidden"
            >
              <Menu aria-hidden />
            </IconButton>
          </DialogTrigger>
          <DrawerContent title={SITE_NAME} side="right">
            <nav aria-label="Primary" className="flex flex-col gap-1">
              {PRIMARY_NAV.map((item) => (
                <DialogClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="rounded-md px-3 py-2.5 text-[15px] font-medium text-fg-muted transition-colors hover:bg-surface-subtle hover:text-fg aria-[current=page]:text-brand"
                  >
                    {item.label}
                  </Link>
                </DialogClose>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              <Button asChild variant="secondary" size="md">
                <a href={CTA.signIn}>Sign in</a>
              </Button>
              <Button asChild size="md">
                <a href={CTA.create}>Create a memorial</a>
              </Button>
            </div>
          </DrawerContent>
        </Dialog>
      </div>
    </header>
  );
}
