import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getAuthUser();
  if (user) redirect("/");

  return (
    <main
      id="main-content"
      className="flex min-h-full flex-1 items-center justify-center bg-surface-subtle px-6 py-16"
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <p className="font-serif text-lg font-medium tracking-tight text-fg">Evermora</p>
          <span className="rounded-sm border border-line-strong px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">
            Staff console
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}
