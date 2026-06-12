import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <header className="flex h-14 items-center justify-between border-b border-zinc-800 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500">
            <span className="text-xs font-bold text-white">W</span>
          </div>
          <span className="text-sm font-medium text-white">WAAI SaaS</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/agents"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Agentes
          </Link>
          <Link
            href="/dashboard/conversations"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Conversaciones
          </Link>
          <Link
            href="/dashboard/knowledge"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Knowledge
          </Link>
          <Link
            href="/dashboard/whatsapp"
            className="text-sm text-zinc-400 hover:text-white"
          >
            WhatsApp
          </Link>
          <Link
            href="/dashboard/leads"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Leads
          </Link>
          <Link
            href="/dashboard/analytics"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Analytics
          </Link>
          <Link
            href="/dashboard/settings/billing"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Settings
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-zinc-400 hover:text-white"
            >
              Salir
            </button>
          </form>
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
