import { type NextRequest } from "next/server";
import { bypassesUserSession } from "@/lib/auth/machine-endpoints";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // This endpoint has its own mandatory Bearer-secret authentication in the
  // route handler. Keep the exception exact so no other API route bypasses
  // the normal user/session gate.
  if (bypassesUserSession(request.nextUrl.pathname)) {
    return;
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
