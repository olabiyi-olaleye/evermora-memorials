import type { Metadata } from "next";
import { Section } from "@/components/marketing/primitives";
import { PageIntro } from "@/components/marketing/sections";
import { ServiceRequestForm } from "./service-request-form";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Ask the Evermora team for help with the practical details — funeral planning, programme printing, livestreaming, catering, transport or flowers.",
  alternates: { canonical: "/services" },
};

const HELP = [
  "Funeral and memorial planning",
  "Programme and order-of-service printing",
  "Livestream setup for people who can't attend",
  "Catering, transport and flowers",
];

export default function ServicesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Practical help"
        title="Support for the practical details"
        lead="Losing someone is hard enough. Tell us what you need and the Evermora team will get back to you — there's no account to create, and no obligation."
      />

      <Section ground="surface" bordered>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-xl text-fg">What we can help with</h2>
            <ul className="flex flex-col gap-2.5">
              {HELP.map((h) => (
                <li key={h} className="flex gap-2.5 text-[0.95rem] leading-relaxed text-fg-muted">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent/60" />
                  {h}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm leading-relaxed text-fg-subtle">
              Evermora coordinates with trusted providers. We&rsquo;re not an automated marketplace
              — a person reads every request.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-raised p-6 shadow-e1 sm:p-8">
            <ServiceRequestForm />
          </div>
        </div>
      </Section>
    </>
  );
}
