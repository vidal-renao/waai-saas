export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { CreateWorkspaceForm } from "@/features/workspaces/CreateWorkspaceForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (workspaceId) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Set Up Your Workspace
          </h1>
          <p className="mt-2 text-zinc-400">
            Tell us about your business to get started.
          </p>
        </div>
        <CreateWorkspaceForm />
      </div>
    </div>
  );
}
