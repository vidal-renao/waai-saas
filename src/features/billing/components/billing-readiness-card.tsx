import Link from "next/link";

interface BillingReadinessCardProps {
  planId: string;
  planName: string;
  stripeConfigured: boolean;
  humanHandoffEnabled: boolean;
}

export function BillingReadinessCard({
  planId,
  planName,
  stripeConfigured,
  humanHandoffEnabled,
}: BillingReadinessCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Plan Status</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Active Plan</span>
          <span className="rounded-full bg-green-900/40 px-3 py-0.5 text-xs font-semibold text-green-400 capitalize">
            {planName}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Human Transfer</span>
          <span className={`text-xs font-medium ${humanHandoffEnabled ? "text-green-400" : "text-zinc-500"}`}>
            {humanHandoffEnabled ? "Enabled" : "Not available on this plan"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Stripe</span>
          <span className={`text-xs font-medium ${stripeConfigured ? "text-green-400" : "text-yellow-500"}`}>
            {stripeConfigured ? "Configured" : "Pending"}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
        <p className="text-xs text-zinc-500">
          Plan ID: <span className="font-mono text-zinc-300">{planId}</span>
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          To change your plan, contact support or activate Stripe.
        </p>
      </div>

      <div className="mt-4">
        <Link
          href="/dashboard/settings/usage"
          className="text-xs text-green-500 hover:text-green-400"
        >
          View detailed usage →
        </Link>
      </div>
    </div>
  );
}
