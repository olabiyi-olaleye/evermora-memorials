import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center"
    >
      <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">Evermora</p>
      <h1 className="font-serif text-[clamp(1.5rem,1.3rem+1vw,2rem)] text-fg">
        This page could not be found
      </h1>
      <p className="text-sm leading-relaxed text-fg-muted">
        The memorial you&rsquo;re looking for may have moved, or the link may be incomplete.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-brand underline-offset-4 hover:text-brand-hover hover:underline"
      >
        Go to Evermora
      </Link>
    </main>
  );
}
