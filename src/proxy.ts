import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const AUTH_ROUTES = ["/login", "/register"];
const PROTECTED_ROUTES = ["/dashboard", "/onboarding"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });
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
    return NextResponse.redirect(new URL("/login", request.url));
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
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // No workspace on login → send to onboarding
    if (pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
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
      return NextResponse.redirect(new URL("/dashboard", request.url));
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
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
