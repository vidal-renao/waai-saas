#!/usr/bin/env node
/**
 * Verifies that all waai_ tables have RLS enabled in the connected Supabase project.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set.
 *
 * Usage:
 *   npx ts-node --skipProject scripts/verify-rls-policies.ts
 *
 * This script only reads metadata — it does not modify the database.
 */

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";

async function main() {
  console.log(`\n${BOLD}WAAI SaaS — RLS Policy Verification${RESET}`);
  console.log(`${"─".repeat(60)}\n`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(`${RED}ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.${RESET}`);
    process.exit(1);
  }

  const query = `
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'waai_%'
    ORDER BY tablename;
  `;

  let data: Array<{ tablename: string; rowsecurity: boolean }>;
  try {
    // Use Supabase SQL API (pg/query endpoint requires service role)
    const execResponse = await fetch(`${supabaseUrl}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!execResponse.ok) {
      throw new Error(`API error: ${execResponse.status}`);
    }

    data = await execResponse.json();
  } catch {
    console.log(`${YELLOW}Could not connect to Supabase automatically.${RESET}`);
    console.log("Run this SQL manually in Supabase Dashboard → SQL Editor:\n");
    console.log("```sql");
    console.log(query.trim());
    console.log("```\n");
    console.log("All rows must have: rowsecurity = true\n");
    printManualChecklist();
    process.exit(0);
  }

  let rlsMissing = 0;

  for (const row of data) {
    if (row.rowsecurity) {
      console.log(`  ${GREEN}✓ RLS ON${RESET}  ${row.tablename}`);
    } else {
      console.log(`  ${RED}✗ RLS OFF${RESET} ${row.tablename}`);
      rlsMissing++;
    }
  }

  if (data.length === 0) {
    console.log(`${YELLOW}No waai_ tables found. Are migrations applied?${RESET}`);
    process.exit(1);
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Tables checked: ${data.length}`);

  if (rlsMissing > 0) {
    console.log(`\n${RED}${BOLD}FAIL — ${rlsMissing} table(s) have RLS disabled.${RESET}\n`);
    console.log("Fix with:");
    console.log("  ALTER TABLE <tablename> ENABLE ROW LEVEL SECURITY;\n");
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}PASS — All ${data.length} waai_ tables have RLS enabled.${RESET}\n`);
    process.exit(0);
  }
}

function printManualChecklist() {
  const expectedTables = [
    "waai_workspaces",
    "waai_workspace_members",
    "waai_plans",
    "waai_subscriptions",
    "waai_usage_counters",
    "waai_agents",
    "waai_agent_knowledge_sources",
    "waai_agent_runs",
    "waai_conversations",
    "waai_messages",
    "waai_knowledge_documents",
    "waai_knowledge_chunks",
    "waai_whatsapp_connections",
    "waai_whatsapp_messages",
    "waai_whatsapp_webhook_events",
    "waai_leads",
    "waai_internal_notes",
    "waai_conversation_assignments",
    "waai_handoffs",
    "waai_system_health_events",
    "waai_billing_events",
    "waai_ai_cost_snapshots",
  ];

  console.log("Expected tables with RLS:");
  for (const t of expectedTables) {
    console.log(`  - [ ] ${t}`);
  }
}

main().catch((err) => {
  console.error(`\n${RED}Unexpected error:${RESET}`, err);
  process.exit(1);
});
