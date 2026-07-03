export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { LeadRepository } from "@/server/repositories/lead-repository";
import { LeadList } from "@/features/leads/components/lead-list";

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) redirect("/onboarding");

  const leadRepo = new LeadRepository(supabase);
  const leads = await leadRepo.findByWorkspace(workspaceId, { limit: 50 });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Business opportunities detected by your AI Employee or created manually.
        </p>
      </div>
      <LeadList leads={leads} />
    </div>
  );
}
