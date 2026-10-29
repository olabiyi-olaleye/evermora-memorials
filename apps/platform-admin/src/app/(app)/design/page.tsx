import type { Metadata } from "next";
import { DesignCatalogue } from "./catalogue";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

/**
 * The `@evermora/ui` component catalogue (Phase 6A.0). Staff-only — it renders
 * inside the platform-admin `(app)` shell, which requires a platform admin.
 * Reserved as a slug so it can never collide with a public memorial address.
 */
export default function DesignSystemPage() {
  return <DesignCatalogue />;
}
