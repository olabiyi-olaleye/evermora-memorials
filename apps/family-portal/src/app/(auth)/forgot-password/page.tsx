import Link from "next/link";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-medium text-fg">Reset your password</h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          We&rsquo;ll email you a link to choose a new password.
        </p>
      </div>
      <ForgotPasswordForm />
      <Link href="/sign-in" className="text-sm text-fg-muted underline hover:text-fg">
        Back to sign in
      </Link>
    </div>
  );
}
