import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import {
  buildContentSecurityPolicy,
  generateNonce,
} from "@/lib/security/content-security-policy";

const AUTH_ROUTES = ["/login", "/register"];
const PROTECTED_ROUTES = ["/dashboard", "/onboarding"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Per-request CSP nonce. It must be readable by the RSC render (via the
  // forwarded request header) AND returned to the browser (via the response
  // header) so Next.js can stamp its inline framework scripts with the nonce.
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  // Apply the CSP to any response leaving this middleware (main pass-through
  // and every redirect branch), keeping the policy consistent across the app.
  const withCsp = <T extends NextResponse>(res: T): T => {
    res.headers.set("content-security-policy", csp);
    return res;
  };

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createMiddlewareClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isProtectedRoute = PROTECTED_ROUTES.some((r) =>
    pathname.startsWith(r)
  );

  // Unauthenticated → redirect to login for protected routes
  if (!user && isProtectedRoute) {
    return withCsp(NextResponse.redirect(new URL("/login", request.url)));
  }

  // Authenticated on auth pages → check workspace and redirect
  if (user && isAuthRoute) {
    const { data: member } = await supabase
      .from("waai_workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (member) {
      return withCsp(NextResponse.redirect(new URL("/dashboard", request.url)));
    }
    // No workspace on login → send to onboarding
    if (pathname.startsWith("/login")) {
      return withCsp(
        NextResponse.redirect(new URL("/onboarding", request.url))
      );
    }
  }

  // Authenticated on /onboarding → redirect to dashboard if already has workspace
  if (user && pathname.startsWith("/onboarding")) {
    const { data: member } = await supabase
      .from("waai_workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (member) {
      return withCsp(NextResponse.redirect(new URL("/dashboard", request.url)));
    }
  }

  // Authenticated on /dashboard → redirect to onboarding if no workspace
  if (user && pathname.startsWith("/dashboard")) {
    const { data: member } = await supabase
      .from("waai_workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!member) {
      return withCsp(
        NextResponse.redirect(new URL("/onboarding", request.url))
      );
    }
  }

  return withCsp(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
