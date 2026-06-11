"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KNOWLEDGE_SOURCE_TYPES } from "@/lib/validators/knowledge";

const SOURCE_LABELS: Record<string, string> = {
  manual: "Texto manual",
  txt: "Archivo TXT (pegar contenido)",
  markdown: "Markdown",
  faq: "FAQ (Preguntas y Respuestas)",
};

export function KnowledgeDocumentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const data = {
      title: (form.elements.namedItem("title") as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLInputElement).value || undefined,
      source_type: (form.elements.namedItem("source_type") as HTMLSelectElement).value,
      text_content: (form.elements.namedItem("text_content") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/knowledge/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "Error al crear el documento.");
      } else {
        router.push(`/dashboard/knowledge/${result.id}`);
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-zinc-300">
          Título <span className="text-red-400">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          placeholder="Ej: Catálogo de servicios 2026"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-green-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-zinc-300">
          Descripción (opcional)
        </label>
        <input
          id="description"
          name="description"
          type="text"
          maxLength={500}
          placeholder="Breve descripción del contenido"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-green-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="source_type" className="text-sm font-medium text-zinc-300">
          Tipo de fuente <span className="text-red-400">*</span>
        </label>
        <select
          id="source_type"
          name="source_type"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
        >
          {KNOWLEDGE_SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {SOURCE_LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="text_content" className="text-sm font-medium text-zinc-300">
          Contenido <span className="text-red-400">*</span>
        </label>
        <textarea
          id="text_content"
          name="text_content"
          required
          minLength={10}
          maxLength={200000}
          rows={14}
          placeholder="Pega aquí el contenido del documento…"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-green-500 focus:outline-none"
        />
        <p className="text-xs text-zinc-600">Máximo 200,000 caracteres.</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
      >
        {loading ? "Creando…" : "Crear documento"}
      </button>
    </form>
  );
}
