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
        <h1 className="font-serif text-2xl font-medium text-fg">Platform admin</h1>
        <p className="mt-1.5 text-sm text-fg-muted">Sign in with your Evermora staff account.</p>
      </div>
      <SignInForm next={next} />
    </div>
  );
}
