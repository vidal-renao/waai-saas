#!/usr/bin/env node
/**
 * Verifies that the environment is properly configured for WAAI SaaS staging.
 *
 * This script extends the existing verify-production-env.ts with
 * staging-specific validations:
 * - WHATSAPP_PROVIDER must be 'mock' in staging
 * - NEXT_PUBLIC_APP_URL must not be empty
 * - Warns if ENCRYPTION_KEY is missing (required for WhatsApp token encryption)
 *
 * Usage:
 *   npx ts-node --skipProject scripts/verify-staging-readiness.ts
 *
 * Exit codes:
 *   0 — All required variables present (may have warnings)
 *   1 — One or more required variables missing
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
  {
    name: "ANTHROPIC_MODEL",
    required: false,
    group: "AI",
    note: "Defaults to haiku",
  },
  { name: "OPENAI_API_KEY", required: true, group: "AI" },
  {
    name: "OPENAI_EMBEDDING_MODEL",
    required: false,
    group: "AI",
    note: "Defaults to text-embedding-3-small",
  },
  {
    name: "OPENAI_EMBEDDING_DIMENSIONS",
    required: false,
    group: "AI",
    note: "Defaults to 1536",
  },

  // Group 3 — WhatsApp (staging = mock)
  {
    name: "WHATSAPP_PROVIDER",
    required: false,
    group: "WhatsApp",
    note: "Must be 'mock' in staging",
  },
  {
    name: "WHAPI_TOKEN",
    required: false,
    group: "WhatsApp",
    note: "Leave empty in staging",
  },
  {
    name: "WHAPI_BASE_URL",
    required: false,
    group: "WhatsApp",
    note: "Leave empty in staging",
  },
  {
    name: "WHAPI_WEBHOOK_SECRET",
    required: false,
    group: "WhatsApp",
    note: "Leave empty in staging",
  },

  // Group 4 — Security
  {
    name: "ENCRYPTION_KEY",
    required: false,
    group: "Security",
    note: "Recommended even in staging",
  },
  { name: "INTERNAL_API_SECRET", required: true, group: "Security" },
  {
    name: "LOG_LEVEL",
    required: false,
    group: "Ops",
    note: "Defaults to info",
  },
  {
    name: "ENABLE_DEBUG_LOGS",
    required: false,
    group: "Ops",
    note: "Should be false",
  },

  // Group 5 — Future (must be empty in staging)
  {
    name: "STRIPE_SECRET_KEY",
    required: false,
    group: "Future (must be empty in staging)",
    note: "Must NOT be set in staging",
  },
  { name: "SENTRY_DSN", required: false, group: "Future (must be empty in staging)" },
  { name: "CRON_SECRET", required: false, group: "Future (must be empty in staging)" },
];

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function maskValue(name: string, value: string): string {
  const sensitive = ["KEY", "SECRET", "TOKEN", "PASSWORD", "PASS", "DSN", "ACCESS_TOKEN"];
  const isSensitive = sensitive.some((s) => name.toUpperCase().includes(s));
  if (isSensitive) return "***" + value.slice(-4);
  if (value.length > 30) return value.slice(0, 15) + "...";
  return value;
}

function main() {
  console.log(
    `\n${BOLD}WAAI SaaS — Staging Environment Readiness Check${RESET}`
  );
  console.log(`${"─".repeat(60)}\n`);

  let missingRequired = 0;
  let missingOptional = 0;
  let present = 0;
  const warnings: string[] = [];
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

  // Staging-specific validations
  console.log(`\n${BOLD}[Staging Validations]${RESET}`);

  // WHATSAPP_PROVIDER must be 'mock' in staging
  const waProvider = process.env.WHATSAPP_PROVIDER;
  if (!waProvider || waProvider === "mock") {
    console.log(
      `  ${GREEN}✓ OK${RESET}     WHATSAPP_PROVIDER is mock (${waProvider ?? "unset — defaults to mock"})`
    );
  } else {
    warnings.push(
      `WHATSAPP_PROVIDER = '${waProvider}' — must be 'mock' in staging to avoid sending real WhatsApp messages`
    );
    console.log(
      `  ${RED}✗ WARN${RESET}    WHATSAPP_PROVIDER = '${waProvider}' — staging should use 'mock'`
    );
  }

  // NEXT_PUBLIC_APP_URL must not be empty
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl || appUrl.trim() === "") {
    warnings.push("NEXT_PUBLIC_APP_URL is empty — set to staging URL or http://localhost:3000");
    console.log(
      `  ${YELLOW}○ WARN${RESET}    NEXT_PUBLIC_APP_URL is empty`
    );
  } else {
    console.log(`  ${GREEN}✓ OK${RESET}     NEXT_PUBLIC_APP_URL = ${appUrl}`);
  }

  // ENCRYPTION_KEY recommendation
  const encKey = process.env.ENCRYPTION_KEY;
  if (!encKey || encKey.trim() === "") {
    warnings.push(
      "ENCRYPTION_KEY is missing — generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
    console.log(
      `  ${YELLOW}○ WARN${RESET}    ENCRYPTION_KEY is empty — recommended for WhatsApp token encryption`
    );
  } else {
    console.log(`  ${GREEN}✓ OK${RESET}     ENCRYPTION_KEY is set (${encKey.length} chars)`);
  }

  // STRIPE_SECRET_KEY must be empty in staging
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && stripeKey.trim() !== "") {
    warnings.push(
      "STRIPE_SECRET_KEY is set — must be EMPTY in staging to avoid accidental real charges"
    );
    console.log(
      `  ${RED}✗ WARN${RESET}    STRIPE_SECRET_KEY is set — leave empty in staging!`
    );
  } else {
    console.log(`  ${GREEN}✓ OK${RESET}     STRIPE_SECRET_KEY is empty (correct for staging)`);
  }

  // Summary
  console.log(`\n${"─".repeat(60)}`);
  console.log(`${GREEN}Present:${RESET}          ${present}`);
  console.log(`${YELLOW}Empty (optional):${RESET} ${missingOptional}`);
  console.log(`${RED}Missing (required):${RESET} ${missingRequired}`);

  if (warnings.length > 0) {
    console.log(`\n${YELLOW}${BOLD}Warnings (${warnings.length}):${RESET}`);
    for (const w of warnings) {
      console.log(`  ${YELLOW}⚠${RESET}  ${w}`);
    }
  }

  if (missingRequired > 0) {
    console.log(
      `\n${RED}${BOLD}FAIL — ${missingRequired} required variable(s) missing. Fix before deploying to staging.${RESET}\n`
    );
    process.exit(1);
  } else if (warnings.some((w) => w.includes("WHATSAPP_PROVIDER") || w.includes("STRIPE_SECRET_KEY"))) {
    console.log(
      `\n${RED}${BOLD}FAIL — Staging safety check failed. Review warnings above.${RESET}\n`
    );
    process.exit(1);
  } else {
    console.log(
      `\n${GREEN}${BOLD}${warnings.length > 0 ? "PASS (with warnings)" : "PASS"} — Staging environment is ready.${RESET}`
    );
    if (warnings.length > 0) {
      console.log(
        `${CYAN}Review the warnings above before final smoke tests.${RESET}\n`
      );
    } else {
      console.log();
    }
    process.exit(0);
  }
}

main();
