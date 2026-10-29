import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPublicSupabase } from "@/lib/supabase";

/**
 * Printed-QR landing route. A scanned code points at `/q/{token}` — a permanent
 * identifier independent of the slug or the memorial's name. `resolve_share_token`
 * (SECURITY DEFINER) maps it to the current canonical slug.
 *
 *   active  → redirect to `/{canonical_slug}`
 *   retired → a gentle notice (the printed artifact still "works")
 *   unknown → 404
 */

export const metadata: Metadata = {
  title: "Memorial",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ShareResolverPage({ params }: PageProps) {
  const { token } = await params;
  const lookup = decodeURIComponent(token).trim().toLowerCase();
  if (!/^[a-f0-9]{6,64}$/.test(lookup)) notFound();

  const supabase = getPublicSupabase();
  const { data, error } = await supabase.rpc("resolve_share_token", { lookup }).maybeSingle();

  if (error || !data) notFound();

  const canonicalSlug = data.canonical_slug as string | null;
  const isActive = data.is_active as boolean;

  if (isActive && canonicalSlug) {
    redirect(`/${canonicalSlug}`);
  }

  // Retired print run, or the memorial is no longer publicly available.
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center"
    >
      <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">Evermora</p>
      <h1 className="font-serif text-[clamp(1.5rem,1.3rem+1vw,2rem)] text-fg">
        This memorial isn&rsquo;t available here
      </h1>
      <p className="text-sm leading-relaxed text-fg-muted">
        The code you scanned is from an earlier printing, or the family has made the memorial
        private. If someone shared a direct link with you, please use that instead.
      </p>
      <Link
        href={canonicalSlug ? `/${canonicalSlug}` : "/"}
        className="text-sm font-medium text-brand underline-offset-4 hover:text-brand-hover hover:underline"
      >
        {canonicalSlug ? "Try the memorial page" : "Go to Evermora"}
      </Link>
    </main>
  );
}
