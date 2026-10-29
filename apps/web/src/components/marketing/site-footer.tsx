import Link from "next/link";
import { FOOTER_NAV, SITE_NAME } from "@/lib/site";

const year = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface-subtle px-6 py-16">
      <div className="mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-[1.4fr_repeat(5,1fr)]">
        <div className="flex flex-col gap-3">
          <p className="font-serif text-lg font-medium text-fg">{SITE_NAME}</p>
          <p className="max-w-xs text-sm leading-relaxed text-fg-muted">
            A calm, lasting place to remember someone you love — kept by the family.
          </p>
        </div>

        {FOOTER_NAV.map((group) => (
          <nav key={group.heading} aria-label={group.heading} className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
              {group.heading}
            </p>
            <ul className="flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-fg-muted transition-colors hover:text-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto mt-14 flex w-full max-w-6xl flex-col gap-2 border-t border-line pt-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {SITE_NAME}. All rights reserved.
        </p>
        <p>A family-controlled digital remembrance platform.</p>
      </div>
    </footer>
  );
}
