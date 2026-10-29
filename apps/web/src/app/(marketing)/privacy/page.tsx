import Link from "next/link";
import { marketingMetadata } from "@/lib/marketing-metadata";
import { LegalPage } from "@/components/marketing/legal";

export const metadata = marketingMetadata({
  title: "Privacy",
  description:
    "How Evermora handles memorial content, visitor information and family data — and the controls a family has over who can see a memorial.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy at Evermora"
      updated="September 2026"
      intro={
        <p>
          This page explains, in plain language, what information Evermora holds and how a family
          controls who can see a memorial. It describes how the product works today and will be
          updated as Evermora changes.
        </p>
      }
    >
      <section>
        <h2>Who controls a memorial</h2>
        <p>
          A memorial belongs to the family who creates it. The owner and the people they invite
          decide what the memorial contains, who can open it, and who can help manage it. Evermora
          staff do not edit or publish a family&rsquo;s memorial; staff act only through defined
          platform operations — for example suspending a memorial in response to a report — and
          every such action is recorded.
        </p>
      </section>

      <section>
        <h2>Visibility and search</h2>
        <p>These are two separate choices, and Evermora never conflates them:</p>
        <ul>
          <li>
            <strong>Visibility</strong> — private (invited people only), anyone with the link, or
            public. A private memorial is not reachable by URL.
          </li>
          <li>
            <strong>Search indexing</strong> — off by default. A public link is not added to search
            engines unless the family turns indexing on.
          </li>
        </ul>
        <p>
          Individual sections — the family details, the burial location — can be restricted to
          members regardless of the memorial&rsquo;s overall visibility.
        </p>
      </section>

      <section>
        <h2>Information from visitors</h2>
        <p>
          A visitor can leave a tribute or a remembrance without an account. If they choose to give
          an email address, it is used only to let them know whether the family approved their
          tribute — it is never shown on the memorial and never shared. Reports and service requests
          are handled by Evermora staff and are not visible to other visitors.
        </p>
      </section>

      <section>
        <h2>Family and account data</h2>
        <p>
          For people who create or help manage a memorial, Evermora stores the account details
          needed to sign in and the record of what each member can do. This information is used to
          operate the service and is not sold.
        </p>
      </section>

      <section>
        <h2>Keeping data</h2>
        <p>
          A memorial exists for as long as the family keeps it. An owner can make a memorial private
          at any time, which stops the public link resolving immediately, and can request its
          removal.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          For any question about privacy, or to make a request about your information, contact the
          Evermora team through the <Link href="/support">support page</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
