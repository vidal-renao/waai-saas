#!/usr/bin/env node
/**
 * Verifies all WAAI health endpoints are responding correctly.
 * Requires APP_URL and INTERNAL_API_SECRET to be set (or passed as env vars).
 *
 * Usage:
 *   APP_URL=https://your-domain.vercel.app INTERNAL_API_SECRET=secret \
 *     npx ts-node --skipProject scripts/verify-health-endpoints.ts
 *
 * For local testing:
 *   APP_URL=http://localhost:3000 INTERNAL_API_SECRET=your-local-secret \
 *     npx ts-node --skipProject scripts/verify-health-endpoints.ts
 */

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";

interface HealthResponseBody {
  status?: string;
  timestamp?: string;
  version?: string;
  environment?: string;
  database?: string;
  model?: string;
  provider?: string;
  message?: string;
  error?: string;
}

interface EndpointCheck {
  name: string;
  path: string;
  requiresSecret: boolean;
  expectedStatus: number;
  expectStatusField?: string;
}

const ENDPOINTS: EndpointCheck[] = [
  {
    name: "Public health check",
    path: "/api/health",
    requiresSecret: false,
    expectedStatus: 200,
    expectStatusField: "ok",
  },
  {
    name: "Public health — unauthenticated 401 guard",
    path: "/api/health/db",
    requiresSecret: false,
    expectedStatus: 401,
  },
  {
    name: "Database health",
    path: "/api/health/db",
    requiresSecret: true,
    expectedStatus: 200,
  },
  {
    name: "AI health",
    path: "/api/health/ai",
    requiresSecret: true,
    expectedStatus: 200,
  },
  {
    name: "WhatsApp health",
    path: "/api/health/whatsapp",
    requiresSecret: true,
    expectedStatus: 200,
  },
];

async function main() {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.INTERNAL_API_SECRET;

  console.log(`\n${BOLD}WAAI SaaS — Health Endpoint Verification${RESET}`);
  console.log(`${"─".repeat(60)}\n`);

  if (!appUrl) {
    console.error(`${RED}ERROR: APP_URL or NEXT_PUBLIC_APP_URL must be set.${RESET}`);
    console.error("Usage: APP_URL=https://your-domain.vercel.app ... node scripts/verify-health-endpoints.js");
    process.exit(1);
  }

  if (!secret) {
    console.warn(`${YELLOW}WARNING: INTERNAL_API_SECRET not set. Internal endpoint tests will be skipped.${RESET}\n`);
  }

  console.log(`Target: ${BOLD}${appUrl}${RESET}\n`);

  let passed = 0;
  let failed = 0;

  for (const endpoint of ENDPOINTS) {
    if (endpoint.requiresSecret && !secret) {
      console.log(`  ${YELLOW}⊘ SKIP${RESET}   ${endpoint.name} (no INTERNAL_API_SECRET)`);
      continue;
    }

    const url = `${appUrl}${endpoint.path}`;
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    if (endpoint.requiresSecret && secret) {
      headers["x-internal-secret"] = secret;
    }

    try {
      const response = await fetch(url, { headers });
      const body = (await response.json().catch(() => null)) as HealthResponseBody | null;

      const statusOk = response.status === endpoint.expectedStatus;
      const fieldOk = !endpoint.expectStatusField ||
        (body && body.status === endpoint.expectStatusField);

      if (statusOk && fieldOk) {
        passed++;
        const statusVal = body?.status ? ` (status: ${body.status})` : "";
        console.log(`  ${GREEN}✓ PASS${RESET}    ${endpoint.name}${statusVal}`);
      } else {
        failed++;
        console.log(`  ${RED}✗ FAIL${RESET}    ${endpoint.name}`);
        console.log(`         Expected HTTP ${endpoint.expectedStatus}, got ${response.status}`);
        if (endpoint.expectStatusField && body?.status !== endpoint.expectStatusField) {
          console.log(`         Expected status field "${endpoint.expectStatusField}", got "${body?.status}"`);
        }
        if (body) {
          console.log(`         Response: ${JSON.stringify(body).slice(0, 150)}`);
        }
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ${RED}✗ ERROR${RESET}   ${endpoint.name}: ${message}`);
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`${GREEN}Passed:${RESET} ${passed}`);
  console.log(`${RED}Failed:${RESET} ${failed}`);

  if (failed > 0) {
    console.log(`\n${RED}${BOLD}FAIL — ${failed} health check(s) failed.${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}PASS — All health endpoints responding correctly.${RESET}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`\n${RED}Unexpected error:${RESET}`, err);
  process.exit(1);
});
