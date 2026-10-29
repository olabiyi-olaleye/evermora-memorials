import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-medium text-fg">Choose a new password</h1>
        <p className="mt-1.5 text-sm text-fg-muted">Open this page from your reset email.</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
