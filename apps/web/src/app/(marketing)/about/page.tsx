import { marketingMetadata } from "@/lib/marketing-metadata";
import { Prose, Section, Statement } from "@/components/marketing/primitives";
import { FinalCta, PageIntro, PrinciplesSection } from "@/components/marketing/sections";

export const metadata = marketingMetadata({
  title: "About",
  description:
    "Evermora is a family-controlled digital remembrance platform — a permanent digital home for someone's life and legacy, not an obituary generator or a social network.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About Evermora"
        title="A permanent home for a life and a legacy"
        lead="When someone dies, their memory ends up scattered — across group chats, printed programmes, folders of photos, and links that stop working. Evermora gives a family one lasting place to hold all of it."
      />

      <Section ground="surface" bordered>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <Statement>Evermora is a family-controlled digital remembrance platform.</Statement>
          <Prose>
            <p>
              One person. One memorial. One permanent link. That link holds their story, their
              photographs, tributes from the people who knew them, funeral information, and official
              updates from the family — and it keeps working long after the service.
            </p>
            <p>
              We are deliberately <strong>not</strong> an obituary generator, a funeral announcement
              page, a social network, or a generic memorial builder. Those describe a moment. A life
              deserves somewhere that lasts.
            </p>
            <p>
              The family is always in control — of what the memorial contains, of who can see it,
              and of who can help manage it. There is no advertising inside a memorial, and there
              are no popularity mechanics anywhere on Evermora.
            </p>
          </Prose>
        </div>
      </Section>

      <PrinciplesSection />
      <FinalCta />
    </>
  );
}
