import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@evermora/database/supabase/server";

/**
 * Refreshes the Supabase session on every navigation and forwards the rotated
 * auth cookies. Uses the framework-agnostic cookie adapter over the proxy
 * request/response pair.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createSupabaseServerClient({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    cookies: {
      getAll: () => request.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // Touching the user triggers a token refresh if needed.
  await supabase.auth.getUser();

  return response;
}
