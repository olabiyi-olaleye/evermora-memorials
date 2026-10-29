import Link from "next/link";
import { Button } from "@evermora/ui";
import { marketingMetadata } from "@/lib/marketing-metadata";
import { CTA } from "@/lib/site";
import { Section } from "@/components/marketing/primitives";
import { PageIntro } from "@/components/marketing/sections";

export const metadata = marketingMetadata({
  title: "Support",
  description:
    "Help with creating and managing a memorial on Evermora — getting started, privacy and visibility, the permanent Memorial Link, tributes, and funeral information.",
  path: "/support",
});

const FAQS = [
  {
    q: "Do I have to finish the memorial in one sitting?",
    a: "No. Start with a name, dates and a photograph. Add the story, more photos and funeral details whenever the family is ready — nothing is public until you choose to publish.",
  },
  {
    q: "Who can see a memorial?",
    a: "You choose: private (invited people only), anyone with the link, or public. Being public is a separate choice from being listed in search engines — a public link is never automatically indexed.",
  },
  {
    q: "What is the Memorial Link, and can it change?",
    a: "Every memorial has one permanent address people return to. If you ever change the Memorial Address, older links and any printed QR codes keep working — they lead to the new one.",
  },
  {
    q: "How do tributes work?",
    a: "Visitors can leave a tribute without an account. Nothing appears on the memorial until a family member approves it. There are no likes, reactions or rankings.",
  },
  {
    q: "Can other family members help?",
    a: "Yes. Invite relatives and give each of them the access they need — writing the story, managing photos, or reviewing tributes. Owners keep full control.",
  },
  {
    q: "Can I take a memorial down?",
    a: "At any time. You can make it private again immediately, and the public link stops resolving straight away.",
  },
];

export default function SupportPage() {
  return (
    <>
      <PageIntro
        eyebrow="Help & support"
        title="Getting help with a memorial"
        lead="The answers below cover most questions about creating and managing a memorial. For anything else, or for help with funeral arrangements, get in touch."
      >
        <div className="mt-2 flex flex-wrap gap-3">
          <Button asChild size="md">
            <Link href="/services">Contact the team</Link>
          </Button>
          <Button asChild variant="secondary" size="md">
            <a href={CTA.create}>Create a memorial</a>
          </Button>
        </div>
      </PageIntro>

      <Section ground="surface" bordered>
        <h2 className="font-serif text-2xl text-fg">Common questions</h2>
        <dl className="mt-8 flex flex-col">
          {FAQS.map((f) => (
            <div key={f.q} className="border-t border-line py-6">
              <dt className="font-serif text-lg text-fg">{f.q}</dt>
              <dd className="mt-2 max-w-[46rem] text-[0.95rem] leading-relaxed text-fg-muted">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
