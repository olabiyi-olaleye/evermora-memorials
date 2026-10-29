import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getAuthUser();
  if (user) redirect("/");

  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-2">
      {/* Editorial panel — desktop only */}
      <aside className="relative hidden flex-col justify-between bg-brand p-12 text-on-brand lg:flex">
        <p className="font-serif text-xl font-medium tracking-tight">Evermora</p>
        <blockquote className="max-w-md">
          <p className="font-serif text-[1.75rem] leading-[1.3] text-balance">
            A calm, lasting place to remember someone you love — kept by the family.
          </p>
        </blockquote>
        <p className="text-sm text-on-brand/85">One person. One memorial. One permanent link.</p>
      </aside>

      {/* Form area */}
      <main
        id="main-content"
        className="flex flex-col items-center justify-center bg-canvas px-6 py-16"
      >
        <div className="w-full max-w-sm">
          <p className="mb-8 font-serif text-lg font-medium tracking-tight text-fg lg:hidden">
            Evermora
          </p>
          {children}
        </div>
      </main>
    </div>
  );
}
