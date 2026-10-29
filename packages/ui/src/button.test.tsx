import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";
import { cn } from "./cn";

describe("Button", () => {
  it("renders its children as an accessible button", () => {
    render(<Button>Light a candle</Button>);
    expect(screen.getByRole("button", { name: "Light a candle" })).toBeInTheDocument();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Share</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("merges caller class names over defaults", () => {
    render(<Button className="rounded-full">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("rounded-full");
  });
});

describe("cn", () => {
  it("resolves conflicting tailwind utilities, last wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
