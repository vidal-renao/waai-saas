"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createWorkspaceSchema,
  type CreateWorkspaceSchema,
} from "@/lib/validators/workspace";
import { Button } from "@/components/ui/button";

const BUSINESS_TYPES = [
  "Limpieza",
  "Restaurante / Cafetería",
  "Clínica / Salud",
  "Inmobiliaria",
  "Academia / Formación",
  "Construcción / Reformas",
  "Ecommerce",
  "Consultoría / Coaching",
  "Logística",
  "Tecnología / IT",
  "Otro",
];

const COUNTRIES = [
  { code: "ES", name: "España" },
  { code: "CH", name: "Suiza" },
  { code: "MX", name: "México" },
  { code: "AR", name: "Argentina" },
  { code: "CO", name: "Colombia" },
  { code: "CL", name: "Chile" },
];

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkspaceSchema>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { country: "ES" },
  });

  async function onSubmit(values: CreateWorkspaceSchema) {
    setServerError(null);
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const json = await res.json() as { error?: string };
    if (!res.ok) {
      setServerError(json.error ?? "Error al crear el workspace");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm text-zinc-300">
          Nombre de tu empresa *
        </label>
        <input
          id="name"
          type="text"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
          placeholder="Ej. Clínica Bienestar"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="businessType" className="text-sm text-zinc-300">
          Sector
        </label>
        <select
          id="businessType"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          {...register("businessType")}
        >
          <option value="">Selecciona tu sector</option>
          {BUSINESS_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="country" className="text-sm text-zinc-300">
          País
        </label>
        <select
          id="country"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          {...register("country")}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.country && (
          <p className="text-xs text-red-400">{errors.country.message}</p>
        )}
      </div>

      {serverError && (
        <p className="rounded-lg bg-red-900/20 px-3 py-2 text-sm text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Creando workspace..." : "Crear workspace y continuar"}
      </Button>
    </form>
  );
}
