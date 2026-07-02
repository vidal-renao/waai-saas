/**
 * Content-Security-Policy construction for WAAI.
 *
 * The CSP is nonce-based: every request generates a fresh nonce which is
 * injected into the policy and propagated by Next.js to its framework
 * inline scripts. `'strict-dynamic'` lets those trusted scripts load the
 * chunks they need without host allow-listing, while `https:` is a legacy
 * fallback ignored by CSP3-capable browsers.
 *
 * No `'unsafe-inline'` / `'unsafe-eval'` is granted to scripts — this is what
 * makes the policy pass enterprise security reviews (DEBT-006 / CSP).
 */

/** Generate a base64 nonce suitable for a CSP `'nonce-...'` source. */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Derive the browser-reachable Supabase origins (HTTPS + WebSocket) from the
 * public Supabase URL so `connect-src` permits auth token refresh and realtime.
 * Falls back to the wildcard Supabase domains if the env var is absent.
 */
function supabaseConnectSources(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return ["https://*.supabase.co", "wss://*.supabase.co"];
  }
  try {
    const { host } = new URL(url);
    return [`https://${host}`, `wss://${host}`];
  } catch {
    return ["https://*.supabase.co", "wss://*.supabase.co"];
  }
}

/** Build the full CSP header value for a given per-request nonce. */
export function buildContentSecurityPolicy(nonce: string): string {
  const connectSrc = ["'self'", ...supabaseConnectSources()].join(" ");

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:`,
    // Next.js injects inline <style> tags and style attributes; nonces do not
    // cover style attributes, so 'unsafe-inline' is required and low-risk here.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https:`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc}`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `upgrade-insecure-requests`,
  ];

  return directives.join("; ");
}
