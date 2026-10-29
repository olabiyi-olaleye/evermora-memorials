import type { ReactNode } from "react";
import { Container, type ContainerSize } from "@evermora/ui";

/** The padded content region for an admin page, inside `AppShell`'s `<main>`. */
export function PageShell({
  size = "dashboard",
  className,
  children,
}: {
  size?: ContainerSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Container size={size} className={className}>
      <div className="py-6 lg:py-8">{children}</div>
    </Container>
  );
}
