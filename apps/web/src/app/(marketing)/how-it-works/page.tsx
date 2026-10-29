import { marketingMetadata } from "@/lib/marketing-metadata";
import {
  BeforeDuringAfter,
  FinalCta,
  HowItWorks,
  MemorialLinkSection,
  PageIntro,
} from "@/components/marketing/sections";

export const metadata = marketingMetadata({
  title: "How it works",
  description:
    "Creating a memorial on Evermora is four small steps — create, personalise, publish and share, and keep their memory alive. Stop after any of them.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro
        eyebrow="How it works"
        title="Four small steps, and you can stop after any of them"
        lead="Creating a memorial is not a project. Start with a name and a photograph today; add the story, the photos and the funeral details whenever the family is ready."
      />
      <HowItWorks ground="canvas" heading={false} />
      <BeforeDuringAfter />
      <MemorialLinkSection />
      <FinalCta />
    </>
  );
}
