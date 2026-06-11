export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KnowledgeDocumentForm } from "@/features/knowledge/components/knowledge-document-form";

export default async function NewKnowledgePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/knowledge"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← Knowledge Base
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Nuevo documento</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Añade conocimiento del negocio para que tus agentes puedan usarlo al responder.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <KnowledgeDocumentForm />
      </div>
    </div>
  );
}
