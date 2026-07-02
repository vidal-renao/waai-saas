import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Static security headers applied to every response.
 *
 * The Content-Security-Policy is intentionally NOT set here: it is emitted
 * per-request with a cryptographic nonce from `src/proxy.ts`, which is the
 * only place a fresh nonce can be generated for each render. Next.js reads
 * that per-request CSP header and applies the nonce to its framework scripts.
 *
 * These headers are the static ones that never change between requests.
 * Reference: docs/execution/13_TECHNICAL_DEBT_REGISTER.md (DEBT-006).
 */
const securityHeaders = [
  // Force HTTPS for 2 years, include subdomains, allow preload list submission.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Disallow the site from being framed (clickjacking). CSP frame-ancestors
  // is the modern equivalent; both are sent for defence in depth.
  { key: "X-Frame-Options", value: "DENY" },
  // Block MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only the origin on cross-origin navigations.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features the app does not use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Isolate the browsing context group (Spectre-class protections).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry build integration. Source-map upload is skipped automatically when
// SENTRY_AUTH_TOKEN / org / project are absent, so local and CI builds work
// unchanged. Runtime error capture is driven by src/instrumentation*.ts.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
