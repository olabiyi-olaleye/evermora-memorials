import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cn, SkipLink } from "@evermora/ui";
import { fontVars } from "@evermora/ui/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Evermora Family Portal",
    template: "%s · Evermora Family",
  },
  description: "Manage your family's memorials, stories, tributes, and funeral information.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f6f3ea",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("h-full antialiased", fontVars)}>
      <body className="flex min-h-full flex-col font-sans">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
