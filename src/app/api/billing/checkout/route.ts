export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { SubscriptionService } from "@/server/services/subscription.service";
import { checkoutSchema } from "@/lib/validators/billing";
import { isStripeConfigured } from "@/lib/billing/stripe-config";
import { reportError } from "@/lib/observability/report-error";

// Create a Stripe Checkout session for the caller's workspace.
// Admin/owner only. All billing decisions are server-side.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const membership = await membersRepo.findMembership(workspaceId, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const service = new SubscriptionService(supabase);
    const { url } = await service.createCheckout({
      workspaceId,
      planId: parsed.data.planId,
      email: user.email ?? "",
    });
    return NextResponse.json({ url });
  } catch (err) {
    reportError(err, { scope: "billing.checkout", workspaceId });
    const msg = err instanceof Error ? err.message : "checkout_failed";
    if (
      msg.startsWith("PLAN_NOT_PURCHASABLE") ||
      msg.startsWith("PRICE_NOT_CONFIGURED")
    ) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
