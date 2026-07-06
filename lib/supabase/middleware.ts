import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/database";

const PUBLIC_PATHS = ["/login", "/signup", "/auth"];
const GATE_PATHS = ["/pending-approval", "/access-rejected"];

/**
 * Refreshes the Supabase session cookie and gates access:
 * signed out -> /login, signed in but not approved -> /pending-approval or
 * /access-rejected, approved -> the app. This is the first gate; every
 * server action re-checks approval independently (see lib/auth/guard.ts) so
 * a bug here can't be the only thing standing between a pending account and
 * real data.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const isGatePath = GATE_PATHS.some((p) => path.startsWith(p));

  function redirectTo(pathname: string, preserveQuery = false) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    if (!preserveQuery) url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user) {
    if (isPublicPath) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  const status = profile?.status ?? "pending";

  if (status === "approved") {
    if (isPublicPath || isGatePath) return redirectTo("/dashboard");
    return response;
  }

  // Signed in but pending or rejected: only the matching gate page is allowed.
  const gateTarget = status === "rejected" ? "/access-rejected" : "/pending-approval";

  if (path.startsWith(gateTarget)) return response;
  return redirectTo(gateTarget);
}
