export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { LeadRepository } from "@/server/repositories/lead-repository";
import { LeadEventRepository } from "@/server/repositories/lead-event-repository";
import { InternalNoteRepository } from "@/server/repositories/internal-note-repository";
import { LeadDetailPanel } from "@/features/leads/components/lead-detail-panel";
import { LeadAssignmentPanel } from "@/features/leads/components/lead-assignment-panel";
import { InternalNotesPanel } from "@/features/conversations/components/internal-notes-panel";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) redirect("/onboarding");

  const leadRepo = new LeadRepository(supabase);
  const lead = await leadRepo.findById(leadId, workspaceId);
  if (!lead) notFound();

  const eventRepo = new LeadEventRepository(supabase);
  const events = await eventRepo.findByLead(leadId);

  const noteRepo = new InternalNoteRepository(supabase);
  const notes = await noteRepo.findByLead(leadId);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/leads"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← Leads
        </Link>
        <h1 className="mt-2 text-xl font-bold text-white">
          {lead.customer_name ?? lead.summary ?? "Lead"}
        </h1>
        {lead.conversation_id && (
          <Link
            href={`/dashboard/conversations/${lead.conversation_id}`}
            className="mt-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            Ver conversación →
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <LeadDetailPanel lead={lead} />
        <LeadAssignmentPanel
          leadId={lead.id}
          currentAssignedTo={lead.assigned_to}
        />

        {/* Internal notes for lead */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">Notas internas</h3>
          <InternalNotesPanel
            conversationId={lead.conversation_id ?? ""}
            notes={notes}
          />
        </div>

        {/* Lead events */}
        {events.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="mb-3 text-sm font-semibold text-zinc-300">Historial</h3>
            <div className="flex flex-col gap-2">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" />
                  <div>
                    <p className="text-xs text-zinc-400">{ev.event_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-zinc-600">
                      {new Date(ev.created_at).toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
