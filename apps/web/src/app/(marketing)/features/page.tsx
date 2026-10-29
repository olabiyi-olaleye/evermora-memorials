import { marketingMetadata } from "@/lib/marketing-metadata";
import {
  Features,
  FinalCta,
  MemorialLinkSection,
  PageIntro,
  PrivacySection,
} from "@/components/marketing/sections";

export const metadata = marketingMetadata({
  title: "Features",
  description:
    "What a family can build on Evermora: their story, photos and memories, moderated tributes, structured funeral information, official family updates, and family access with the right permissions.",
  path: "/features",
});

export default function FeaturesPage() {
  return (
    <>
      <PageIntro
        eyebrow="What families can build"
        title="A small set of things, done carefully"
        lead="Evermora is deliberately not a long feature list. Everything here exists to help a family tell one life well and keep it reachable."
      />
      <Features heading={false} />
      <MemorialLinkSection />
      <PrivacySection />
      <FinalCta />
    </>
  );
}
