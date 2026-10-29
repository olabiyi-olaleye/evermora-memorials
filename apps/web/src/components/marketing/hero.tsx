import Link from "next/link";
import { Button } from "@evermora/ui";
import { CTA } from "@/lib/site";
import { HeroComposition } from "./motifs";
import { Eyebrow } from "./primitives";

export function Hero() {
  return (
    <section className="bg-canvas px-6 pt-10 pb-20 md:pt-16 md:pb-28">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="flex flex-col gap-6">
          <Eyebrow>One person · one memorial · one permanent link</Eyebrow>
          <h1 className="font-serif text-[clamp(2.5rem,1.8rem+3.4vw,4rem)] leading-[1.08] text-balance text-fg">
            Create a lasting place to remember someone you love.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-fg-muted text-pretty">
            Evermora keeps their story, photographs, tributes, funeral information and family
            updates together in one place — published and controlled by the family, reachable
            through a single link that never has to change.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a href={CTA.create}>Create a memorial</a>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/how-it-works">See how it works</Link>
            </Button>
          </div>
          <p className="text-sm text-fg-subtle">
            Free to start. Add the rest whenever the family is ready.
          </p>
        </div>

        <HeroComposition />
      </div>
    </section>
  );
}
