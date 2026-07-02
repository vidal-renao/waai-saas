-- Billing subscription lifecycle (DEBT-004 / Stripe).
-- Additive, backwards-compatible schema evolution. No existing column changes.
--
-- 1) Subscription lifecycle state needed to drive upgrade/downgrade/cancel/
--    resume and payment-failure handling entirely from Stripe webhooks.
-- 2) Webhook idempotency guarantee on waai_billing_events.
-- 3) Lookup indexes for webhook -> workspace resolution.

-- ── 1. Subscription lifecycle columns ───────────────────────────────────────
ALTER TABLE waai_subscriptions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz;

-- Constrain status to the set of Stripe subscription statuses we recognise.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waai_subscriptions_status_check'
  ) THEN
    ALTER TABLE waai_subscriptions
      ADD CONSTRAINT waai_subscriptions_status_check
      CHECK (status IN (
        'active', 'trialing', 'past_due', 'canceled',
        'incomplete', 'incomplete_expired', 'unpaid', 'paused'
      ));
  END IF;
END $$;

-- ── 2. Webhook idempotency ──────────────────────────────────────────────────
-- A provider event may only be recorded once. Partial unique index so rows
-- without a provider_event_id (internal/system events) are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS waai_billing_events_provider_event_uidx
  ON waai_billing_events (provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

-- ── 3. Webhook lookup indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS waai_subscriptions_stripe_customer_idx
  ON waai_subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS waai_subscriptions_stripe_subscription_idx
  ON waai_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
