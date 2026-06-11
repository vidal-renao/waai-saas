#!/usr/bin/env node
/**
 * Verifies that all required production environment variables are present.
 * Prints MISSING or OK for each variable — never prints actual values.
 *
 * Usage:
 *   npx ts-node --skipProject scripts/verify-production-env.ts
 *   node -r esbuild-register scripts/verify-production-env.ts
 *
 * Alternatively, compile with tsc and run: node scripts/verify-production-env.js
 */

interface EnvCheck {
  name: string;
  required: boolean;
  group: string;
  note?: string;
}

const CHECKS: EnvCheck[] = [
  // Group 1 — Required for boot
  { name: "NEXT_PUBLIC_APP_URL", required: true, group: "Boot" },
  { name: "NEXT_PUBLIC_SUPABASE_URL", required: true, group: "Boot" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true, group: "Boot" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", required: true, group: "Boot" },

  // Group 2 — AI features
  { name: "ANTHROPIC_API_KEY", required: true, group: "AI" },
  { name: "ANTHROPIC_MODEL", required: false, group: "AI", note: "Defaults to haiku" },
  { name: "OPENAI_API_KEY", required: true, group: "AI" },
  { name: "OPENAI_EMBEDDING_MODEL", required: false, group: "AI", note: "Defaults to text-embedding-3-small" },
  { name: "OPENAI_EMBEDDING_DIMENSIONS", required: false, group: "AI", note: "Defaults to 1536" },

  // Group 3 — WhatsApp
  { name: "WHATSAPP_PROVIDER", required: false, group: "WhatsApp", note: "Defaults to mock if unset" },
  { name: "WHAPI_TOKEN", required: false, group: "WhatsApp", note: "Required if WHATSAPP_PROVIDER=whapi" },
  { name: "WHAPI_BASE_URL", required: false, group: "WhatsApp", note: "Required if WHATSAPP_PROVIDER=whapi" },
  { name: "WHAPI_WEBHOOK_SECRET", required: false, group: "WhatsApp", note: "Required for production" },

  // Group 4 — Security & Ops
  { name: "ENCRYPTION_KEY", required: false, group: "Security", note: "Required for WhatsApp token encryption" },
  { name: "INTERNAL_API_SECRET", required: true, group: "Security" },
  { name: "LOG_LEVEL", required: false, group: "Ops", note: "Defaults to info" },
  { name: "ENABLE_DEBUG_LOGS", required: false, group: "Ops", note: "Should be false in production" },

  // Group 5 — Optional / Future
  { name: "STRIPE_SECRET_KEY", required: false, group: "Future (Fase 10)" },
  { name: "SENTRY_DSN", required: false, group: "Future (Fase 10)" },
  { name: "CRON_SECRET", required: false, group: "Future (Fase 10)" },
];

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function main() {
  console.log(`\n${BOLD}WAAI SaaS — Production Environment Variables Verification${RESET}`);
  console.log(`${"─".repeat(60)}\n`);

  let missingRequired = 0;
  let missingOptional = 0;
  let present = 0;
  let currentGroup = "";

  for (const check of CHECKS) {
    if (check.group !== currentGroup) {
      currentGroup = check.group;
      console.log(`\n${BOLD}[${currentGroup}]${RESET}`);
    }

    const value = process.env[check.name];
    const hasValue = Boolean(value && value.trim() !== "");

    if (hasValue) {
      present++;
      const masked = maskValue(check.name, value!);
      console.log(`  ${GREEN}✓ OK${RESET}     ${check.name} ${DIM}(${masked})${RESET}`);
    } else if (check.required) {
      missingRequired++;
      const note = check.note ? ` ${DIM}— ${check.note}${RESET}` : "";
      console.log(`  ${RED}✗ MISSING${RESET} ${check.name}${note}`);
    } else {
      missingOptional++;
      const note = check.note ? ` ${DIM}— ${check.note}${RESET}` : "";
      console.log(`  ${YELLOW}○ EMPTY${RESET}   ${check.name}${note}`);
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`${GREEN}Present:${RESET}          ${present}`);
  console.log(`${YELLOW}Empty (optional):${RESET} ${missingOptional}`);
  console.log(`${RED}Missing (required):${RESET} ${missingRequired}`);

  if (missingRequired > 0) {
    console.log(`\n${RED}${BOLD}FAIL — ${missingRequired} required variable(s) missing. Fix before deploying.${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}PASS — All required variables are present.${RESET}\n`);
    process.exit(0);
  }
}

function maskValue(name: string, value: string): string {
  const sensitive = [
    "KEY", "SECRET", "TOKEN", "PASSWORD", "PASS", "DSN", "ACCESS_TOKEN"
  ];
  const isSensitive = sensitive.some((s) => name.toUpperCase().includes(s));
  if (isSensitive) {
    return "***" + value.slice(-4);
  }
  if (value.length > 30) {
    return value.slice(0, 15) + "...";
  }
  return value;
}

main();
