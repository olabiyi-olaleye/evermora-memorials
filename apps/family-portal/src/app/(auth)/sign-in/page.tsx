import Link from "next/link";
import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-medium text-fg">Welcome back</h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          Sign in to manage your family&rsquo;s memorials.
        </p>
      </div>
      <SignInForm next={next} />
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-fg-muted underline hover:text-fg">
          Forgot password?
        </Link>
        <Link
          href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"}
          className="text-fg-muted underline hover:text-fg"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
