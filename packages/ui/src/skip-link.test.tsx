import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkipLink } from "./skip-link";

describe("SkipLink", () => {
  it("links to the given target id", () => {
    render(<SkipLink targetId="main-content" />);
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
  });

  it("defaults to #main-content", () => {
    render(<SkipLink />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "#main-content");
  });

  it("accepts custom link text", () => {
    render(<SkipLink>Skip to main</SkipLink>);
    expect(screen.getByRole("link", { name: "Skip to main" })).toBeInTheDocument();
  });
});
