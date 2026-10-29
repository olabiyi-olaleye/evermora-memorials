import { Hero } from "@/components/marketing/hero";
import {
  BeforeDuringAfter,
  Features,
  FinalCta,
  HowItWorks,
  MemorialLinkSection,
  PrinciplesSection,
  PrivacySection,
  ServicesSection,
  WhatEvermoraIs,
} from "@/components/marketing/sections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <WhatEvermoraIs />
      <HowItWorks />
      <BeforeDuringAfter />
      <Features />
      <MemorialLinkSection />
      <PrivacySection />
      <ServicesSection />
      <PrinciplesSection />
      <FinalCta />
    </>
  );
}
