import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/auth", () => ({
  signInAction: vi.fn(),
}));

import { SignInForm } from "./sign-in-form";

describe("SignInForm", () => {
  it("renders labelled email + password fields and a submit control", () => {
    render(<SignInForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("carries a safe `next` through as a hidden field", () => {
    const { container } = render(<SignInForm next="/memorials/abc" />);
    const hidden = container.querySelector('input[name="next"]');
    expect(hidden).toHaveValue("/memorials/abc");
  });
});
