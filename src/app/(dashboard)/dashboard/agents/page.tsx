export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAgentsUseCase } from "@/server/use-cases/list-agents";
import { AgentList } from "@/features/agents/components/agent-list";

export default async function AgentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const result = await listAgentsUseCase(supabase, user.id);
  if (!result) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-5xl">
      <AgentList agents={result.agents} limitCheck={result.limitCheck} />
    </div>
  );
}
