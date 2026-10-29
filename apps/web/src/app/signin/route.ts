import { NextResponse } from "next/server";
import { familyOrigin } from "@/lib/site";

/**
 * "Sign In" — the secondary marketing conversion. A first-party URL
 * (`evermora.com/signin`) that redirects into the family portal's sign-in.
 * `signin` is a reserved slug, so this never collides with a memorial.
 */
export function GET() {
  return NextResponse.redirect(`${familyOrigin()}/sign-in`, 307);
}
