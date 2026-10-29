import Link from "next/link";
import type { Metadata } from "next";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-medium text-fg">Create your account</h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          You&rsquo;ll be able to create a memorial in the next step.
        </p>
      </div>
      <SignUpForm next={next} />
      <p className="text-sm text-fg-muted">
        Already have an account?{" "}
        <Link
          href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"}
          className="underline hover:text-fg"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
