import type { ReactNode } from "react";
import { Container, type ContainerSize } from "@evermora/ui";

/**
 * The padded content region for a family-portal page. Sits inside `AppShell`'s
 * `<main>`; the page picks a width (`app` for forms and editors, `dashboard`
 * for overviews and tables).
 */
export function PageShell({
  size = "app",
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
