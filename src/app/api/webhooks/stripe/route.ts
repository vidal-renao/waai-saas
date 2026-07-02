import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SubscriptionService } from "@/server/services/subscription.service";
import { StripeService } from "@/server/services/stripe.service";
import { isStripeConfigured } from "@/lib/billing/stripe-config";
import { reportError } from "@/lib/observability/report-error";

export const maxDuration = 60;

// Stripe webhook receiver. Verifies the signature, then delegates all business
// logic (idempotency + persistence) to SubscriptionService. Uses the service
// role client because there is no user session in a webhook context.
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return new Response("Billing not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return new Response("Could not read body", { status: 400 });
  }

  // Signature verification — reject anything not signed by Stripe.
  let event;
  try {
    event = new StripeService().constructWebhookEvent(rawBody, signature);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const db = createServiceRoleClient();
    await new SubscriptionService(db).processWebhookEvent(event);
  } catch (err) {
    reportError(err, {
      scope: "billing.webhook",
      stripe_event_type: event.type,
    });
    // 500 signals Stripe to retry — idempotency makes reprocessing safe.
    return new Response("Processing error", { status: 500 });
  }

  return Response.json({ received: true });
}
