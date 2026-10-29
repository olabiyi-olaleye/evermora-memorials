import { NextResponse } from "next/server";
import { familyOrigin } from "@/lib/site";

/**
 * "Create a Memorial" — the primary marketing conversion. A first-party URL
 * (`evermora.com/create`) that hands off to the family portal's sign-up, which
 * carries the visitor on to the creation wizard. Environment-aware: the family
 * origin is one env value, so preview / production / custom domains just work.
 *
 * `create` is a reserved slug, so this never collides with a memorial.
 */
export function GET() {
  const target = `${familyOrigin()}/sign-up?next=${encodeURIComponent("/memorials/new")}`;
  return NextResponse.redirect(target, 307);
}
