import type { ReactNode } from "react";
import Link from "next/link";
import { BellRing, Flower2, Heart, Images, Link2, Lock, ScrollText, Users } from "lucide-react";
import { Button, cn } from "@evermora/ui";
import { CTA } from "@/lib/site";
import { MemorialAddress, QrGlyph } from "./motifs";
import { Eyebrow, Section, SectionTitle, Statement } from "./primitives";

/* ------------------------------------------------------------------ */
/*  What a memorial holds                                              */
/* ------------------------------------------------------------------ */

const HOLDS = [
  {
    icon: ScrollText,
    title: "Their story",
    body: "A life written in the family's own words — as short or as full as feels right.",
  },
  {
    icon: Images,
    title: "Photos & memories",
    body: "Albums of photographs, each with a caption, arranged the way the family wants them seen.",
  },
  {
    icon: Heart,
    title: "Tributes",
    body: "Messages from the people whose lives they touched, shown once the family approves them.",
  },
  {
    icon: Flower2,
    title: "Funeral information",
    body: "Wake, service and burial details — date, time, venue, directions and livestream links.",
  },
  {
    icon: BellRing,
    title: "Family updates",
    body: "Official notices from the family: a change of venue, a thank-you, a remembrance.",
  },
  {
    icon: Users,
    title: "Family access",
    body: "Invite relatives to help — each with just the access they need, nothing more.",
  },
];

export function WhatEvermoraIs() {
  return (
    <Section ground="canvas">
      <div className="flex flex-col gap-5">
        <Eyebrow>What Evermora is</Eyebrow>
        <SectionTitle lead="A family creates one memorial for a loved one. It becomes the one lasting place people return to — to read, to contribute, and to find what they need.">
          One person. One memorial. Everything in one place.
        </SectionTitle>
      </div>

      <ul className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {HOLDS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex flex-col gap-2 border-t border-line pt-5">
            <Icon aria-hidden className="size-5 text-accent" strokeWidth={1.75} />
            <h3 className="font-serif text-lg text-fg">{title}</h3>
            <p className="text-[0.95rem] leading-relaxed text-fg-muted">{body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  How it works — 4 steps                                             */
/* ------------------------------------------------------------------ */

export const STEPS = [
  {
    title: "Create their memorial",
    body: "Start with the essentials — their name, dates, and a photograph. It takes a few minutes, and nothing is public yet.",
  },
  {
    title: "Make it personal",
    body: "Add their story, more photographs, and funeral details at your own pace. Invite family to help with their part.",
  },
  {
    title: "Publish and share",
    body: "Choose who can see it, then share the link by message, on a printed programme, or with a QR code.",
  },
  {
    title: "Keep their memory alive",
    body: "Approve tributes as they arrive, post family updates, and add memories for years to come.",
  },
];

export function HowItWorks({
  ground = "surface",
  heading = true,
}: {
  ground?: "surface" | "canvas";
  heading?: boolean;
}) {
  return (
    <Section ground={ground} bordered>
      {heading ? (
        <div className="mb-14 flex flex-col gap-5">
          <Eyebrow>How it works</Eyebrow>
          <SectionTitle lead="Creating a memorial is not a project. It is four small steps, and you can stop after any of them.">
            From first details to a living memorial
          </SectionTitle>
        </div>
      ) : null}

      <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-3 border-t-2 border-brand/25 pt-4">
            <span className="font-mono text-sm text-accent">0{i + 1}</span>
            <h3 className="font-serif text-xl leading-tight text-fg">{step.title}</h3>
            <p className="text-[0.95rem] leading-relaxed text-fg-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Before / During / After                                            */
/* ------------------------------------------------------------------ */

const PHASES = [
  {
    label: "Before",
    title: "In the first days",
    points: [
      "Create the memorial and publish funeral arrangements quickly.",
      "Share one link so relatives stop asking the same questions.",
      "Begin receiving tributes while plans are still coming together.",
    ],
  },
  {
    label: "During",
    title: "Around the service",
    points: [
      "Put the link and a QR code on the programme and order of service.",
      "Guests find directions, timings and the livestream in one place.",
      "Late changes reach everyone through a family update, not a phone tree.",
    ],
  },
  {
    label: "After",
    title: "In the years that follow",
    points: [
      "The memorial stays exactly where it was — the link never expires.",
      "Add photographs and memories as they surface.",
      "Mark anniversaries with an update; welcome new tributes any time.",
    ],
  },
];

export function BeforeDuringAfter() {
  return (
    <Section ground="canvas" bordered>
      <div className="flex flex-col gap-5">
        <Eyebrow>Across time</Eyebrow>
        <SectionTitle lead="A funeral lasts a day. Remembrance lasts far longer. Evermora is built for all of it.">
          One place, before and long after the funeral
        </SectionTitle>
      </div>

      <div className="mt-14 grid gap-10 md:grid-cols-3">
        {PHASES.map((phase) => (
          <div key={phase.label} className="flex flex-col gap-4 border-t border-line pt-5">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
              {phase.label}
            </p>
            <h3 className="font-serif text-xl text-fg">{phase.title}</h3>
            <ul className="flex flex-col gap-2.5">
              {phase.points.map((p) => (
                <li key={p} className="flex gap-2.5 text-[0.95rem] leading-relaxed text-fg-muted">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent/60" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features — alternating editorial spreads                           */
/* ------------------------------------------------------------------ */

export const FEATURES = [
  {
    eyebrow: "Their story",
    title: "A life, told properly",
    body: "Write their story in sections — early life, family, work, faith, whatever matters. Add a timeline of the moments that mattered. Publish it a paragraph at a time.",
  },
  {
    eyebrow: "Photos & memories",
    title: "Photographs, arranged with care",
    body: "Group photos into albums, add captions, and choose the order. The family decides what is shown and what stays private.",
  },
  {
    eyebrow: "Tributes",
    title: "Messages, not comments",
    body: "Visitors leave a tribute without making an account. Nothing appears until the family approves it. No likes, no reactions, no ranking — just what people wanted to say.",
  },
  {
    eyebrow: "Funeral information",
    title: "Everything a guest needs to attend",
    body: "Publish the wake, service and burial as separate events with times, venues, directions and streaming links. Cancelled or changed details are shown clearly.",
  },
  {
    eyebrow: "Family updates",
    title: "Official word from the family",
    body: "Post a notice when something changes — a venue, a livestream, a burial update, a thank-you. It sits with the memorial, dated and clear, never buried in a chat.",
  },
  {
    eyebrow: "Family access",
    title: "Help, with the right permissions",
    body: "Invite a sibling to write the story, a cousin to handle photos, someone to review tributes. Owners keep control; everyone else gets exactly what they need.",
  },
];

export function Features({
  heading = true,
  items = FEATURES,
}: {
  heading?: boolean;
  items?: typeof FEATURES;
}) {
  return (
    <Section ground="surface" bordered>
      {heading ? (
        <div className="mb-16 flex flex-col gap-5">
          <Eyebrow>What families can build</Eyebrow>
          <SectionTitle lead="Not a long feature list — a small set of things done carefully.">
            A memorial worth keeping
          </SectionTitle>
        </div>
      ) : null}

      <div className="flex flex-col gap-14">
        {items.map((f, i) => (
          <article
            key={f.title}
            className={cn(
              "grid items-start gap-6 border-t border-line pt-8 md:grid-cols-[1fr_1.4fr] md:gap-12",
              i % 2 === 1 && "md:[&>*:first-child]:order-2",
            )}
          >
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
              {f.eyebrow}
            </p>
            <div className="flex flex-col gap-3">
              <h3 className="font-serif text-2xl leading-tight text-fg">{f.title}</h3>
              <p className="max-w-[46rem] text-[1.0625rem] leading-[1.7] text-fg-muted">{f.body}</p>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Permanent Memorial Link                                            */
/* ------------------------------------------------------------------ */

export function MemorialLinkSection() {
  return (
    <Section ground="parchment" bordered>
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-6">
          <Eyebrow>The permanent Memorial Link</Eyebrow>
          <Statement>Every memorial has one address people can always come back to.</Statement>
          <p className="max-w-[46rem] text-[1.0625rem] leading-[1.7] text-fg-muted">
            Share it in a WhatsApp message, print it on the order of service, or put it behind a QR
            code. If the family ever changes the Memorial Address, old links and printed QR codes
            keep working — they simply lead to the new one.
          </p>
          <ul className="flex flex-wrap gap-2 text-sm text-fg-muted">
            {[
              "WhatsApp & messages",
              "Funeral programmes",
              "QR codes",
              "Order of service",
              "Social sharing",
            ].map((c) => (
              <li key={c} className="rounded-full border border-line bg-canvas px-3 py-1">
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-5 rounded-2xl border border-line bg-raised p-8 text-center shadow-e1">
          <span aria-hidden className="size-24 text-brand">
            <QrGlyph />
          </span>
          <MemorialAddress />
          <p className="flex items-center gap-2 text-xs text-fg-subtle">
            <Link2 aria-hidden className="size-3.5" />
            One link. It never has to change.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Privacy & family control                                           */
/* ------------------------------------------------------------------ */

const VISIBILITY = [
  { label: "Private", body: "Only people the family invites. Not reachable by link." },
  {
    label: "Anyone with the link",
    body: "Opens for anyone who has the address. Not listed anywhere.",
  },
  { label: "Public", body: "Opens for anyone. May appear in an Evermora listing in future." },
];

export function PrivacySection() {
  return (
    <Section ground="canvas" bordered>
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-5">
          <Eyebrow>Privacy & family control</Eyebrow>
          <SectionTitle lead="The family decides who can open the memorial, and search indexing is a separate choice — a public link is never automatically on a search engine.">
            You are in control of who sees what
          </SectionTitle>
        </div>

        <div className="flex flex-col">
          <dl className="flex flex-col">
            {VISIBILITY.map((v) => (
              <div
                key={v.label}
                className="grid gap-1 border-t border-line py-4 sm:grid-cols-[10rem_1fr] sm:gap-6"
              >
                <dt className="flex items-center gap-2 font-medium text-fg">
                  <Lock aria-hidden className="size-4 text-accent" />
                  {v.label}
                </dt>
                <dd className="text-[0.95rem] leading-relaxed text-fg-muted">{v.body}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm leading-relaxed text-fg-subtle">
            Individual sections — the family details, the burial location — can be kept to members
            only. Tributes can be reviewed before they appear. Different family members can hold
            different levels of access.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Services                                                           */
/* ------------------------------------------------------------------ */

export function ServicesSection() {
  return (
    <Section ground="surface" bordered>
      <div className="flex max-w-2xl flex-col gap-5">
        <Eyebrow>Practical help</Eyebrow>
        <SectionTitle lead="Alongside the memorial, you can ask the Evermora team for help with the practical details — funeral planning, printing the programme, setting up a livestream, catering, transport or flowers.">
          Support for the arrangements
        </SectionTitle>
        <div className="mt-2">
          <Button asChild variant="secondary" size="md">
            <Link href="/services">Explore services</Link>
          </Button>
        </div>
        <p className="text-sm text-fg-subtle">
          Tell us what you need and our team will get back to you. No account required.
        </p>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Product principles                                                 */
/* ------------------------------------------------------------------ */

export const PRINCIPLES = [
  "The family controls the memorial — its content, its privacy, and who can help.",
  "Respectful by design: no advertising inside a memorial, ever.",
  "No popularity mechanics — no likes, followers, reactions or rankings.",
  "Privacy is a real choice, and being public is separate from being searchable.",
  "One permanent link, so what you share today still works years from now.",
  "Your content is yours; you can change visibility or take it down at any time.",
];

export function PrinciplesSection() {
  return (
    <Section ground="canvas" bordered>
      <div className="flex flex-col gap-5">
        <Eyebrow>What we stand for</Eyebrow>
        <SectionTitle>A few things we will not compromise on</SectionTitle>
      </div>
      <ul className="mt-12 grid gap-x-12 gap-y-6 md:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <li
            key={p}
            className="flex gap-3 border-t border-line pt-4 text-[0.95rem] leading-relaxed text-fg-muted"
          >
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
            {p}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */

export function FinalCta() {
  return (
    <Section ground="evergreen">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <span aria-hidden className="h-px w-12 bg-on-brand/40" />
        <h2 className="font-serif text-[clamp(1.875rem,1.4rem+2vw,2.75rem)] leading-tight text-balance text-on-brand">
          Create a lasting place for their story.
        </h2>
        <p className="max-w-xl text-lg leading-relaxed text-on-brand/85 text-pretty">
          Start with the essentials. Add memories, photos, tributes and funeral information whenever
          you&rsquo;re ready.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-on-brand text-brand hover:bg-on-brand/90">
            <a href={CTA.create}>Create a memorial</a>
          </Button>
          <Button asChild variant="ghost" size="lg" className="text-on-brand hover:bg-on-brand/10">
            <Link href="/how-it-works">See how it works</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared small header for sub-pages                                  */
/* ------------------------------------------------------------------ */

export function PageIntro({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Section ground="canvas">
      <div className="flex max-w-3xl flex-col gap-5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-serif text-[clamp(2.25rem,1.7rem+2.6vw,3.25rem)] leading-[1.1] text-balance text-fg">
          {title}
        </h1>
        {lead ? <p className="text-xl leading-relaxed text-fg-muted text-pretty">{lead}</p> : null}
        {children}
      </div>
    </Section>
  );
}
