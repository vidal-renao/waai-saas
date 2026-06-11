import type { WaaiLead } from "@/types/database";
import { LeadStatusBadge } from "./lead-status-badge";
import { LeadPriorityBadge } from "./lead-priority-badge";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-200">{value}</p>
    </div>
  );
}

export function LeadDetailPanel({ lead }: { lead: WaaiLead }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-base font-semibold text-white">Información del Lead</h3>
        <LeadStatusBadge status={lead.status} />
        <LeadPriorityBadge priority={lead.priority} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre" value={lead.customer_name} />
        <Field label="Teléfono" value={lead.customer_phone} />
        <Field label="Email" value={lead.customer_email} />
        <Field label="Empresa" value={lead.company_name} />
        <Field label="Servicio solicitado" value={lead.requested_service} />
        <Field label="Ubicación" value={lead.location} />
        <Field label="Fecha deseada" value={lead.desired_date} />
        <Field label="Presupuesto" value={lead.budget} />
        <Field label="Urgencia" value={lead.urgency} />
        <Field label="Canal" value={lead.source_channel} />
      </div>
      {lead.summary && (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-500">Resumen</p>
          <p className="mt-1 text-sm text-zinc-300">{lead.summary}</p>
        </div>
      )}
      {lead.confidence_score !== null && lead.confidence_score !== undefined && (
        <div className="mt-3">
          <p className="text-xs text-zinc-500">
            Confianza IA: {Math.round(lead.confidence_score * 100)}%
          </p>
        </div>
      )}
    </div>
  );
}
