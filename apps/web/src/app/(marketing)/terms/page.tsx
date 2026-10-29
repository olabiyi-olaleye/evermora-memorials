import Link from "next/link";
import { marketingMetadata } from "@/lib/marketing-metadata";
import { LegalPage } from "@/components/marketing/legal";

export const metadata = marketingMetadata({
  title: "Terms",
  description:
    "The terms for using Evermora — what the service provides, what families are responsible for, and how content and accounts are handled.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of use"
      updated="September 2026"
      intro={
        <p>
          These terms cover the use of Evermora. They are written to be readable rather than
          exhaustive, and will be updated as the service develops.
        </p>
      }
    >
      <section>
        <h2>What Evermora provides</h2>
        <p>
          Evermora lets a family create and manage a memorial for a person who has died, and lets
          visitors view it and contribute where the family allows. The service is provided as-is;
          Evermora works to keep memorials available and secure but does not guarantee uninterrupted
          access.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          You are responsible for keeping your sign-in details secure and for the actions taken
          under your account. Tell us promptly if you believe your account has been used without
          your permission.
        </p>
      </section>

      <section>
        <h2>Content and responsibility</h2>
        <p>
          The family who creates a memorial is responsible for its content and confirms they have
          the right to publish it, including photographs and personal details. Visitors are
          responsible for the tributes they submit. Do not publish content that is unlawful,
          infringes someone else&rsquo;s rights, impersonates a person, or is intended to harass.
        </p>
        <p>
          You keep ownership of the content you add. You grant Evermora the permission needed to
          store and display it as part of running the service.
        </p>
      </section>

      <section>
        <h2>Moderation and platform action</h2>
        <p>
          Anyone can report a memorial or a tribute. Evermora may review reported content and, where
          necessary, hide a tribute or suspend a memorial. A suspended memorial is hidden from the
          public but remains visible to its members and to Evermora staff.
        </p>
      </section>

      <section>
        <h2>Services</h2>
        <p>
          Requests for help with funeral or memorial arrangements are handled separately by the
          Evermora team. Any charges for those services are agreed with you directly before work
          begins.
        </p>
      </section>

      <section>
        <h2>Ending use</h2>
        <p>
          A memorial owner can make a memorial private or request its removal at any time. Evermora
          may suspend or close an account that breaks these terms.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent to the Evermora team through the{" "}
          <Link href="/support">support page</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
