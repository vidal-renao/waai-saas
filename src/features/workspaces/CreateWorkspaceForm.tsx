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
  "Cleaning Services",
  "Restaurant / Café",
  "Healthcare / Medical",
  "Real Estate",
  "Education / Training",
  "Construction / Renovation",
  "E-Commerce",
  "Consulting / Coaching",
  "Logistics",
  "Technology / IT",
  "Financial Services",
  "Legal",
  "Hospitality",
  "Other",
];

const COUNTRIES = [
  { code: "CH", name: "Switzerland" },
  { code: "DE", name: "Germany" },
  { code: "AT", name: "Austria" },
  { code: "LI", name: "Liechtenstein" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
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
    defaultValues: { country: "CH" },
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
      setServerError(json.error ?? "Failed to create workspace");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm text-zinc-300">
          Company Name *
        </label>
        <input
          id="name"
          type="text"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
          placeholder="e.g. Müller GmbH"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="businessType" className="text-sm text-zinc-300">
          Industry
        </label>
        <select
          id="businessType"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          {...register("businessType")}
        >
          <option value="">Select your industry</option>
          {BUSINESS_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="country" className="text-sm text-zinc-300">
          Country
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
        {isSubmitting ? "Creating workspace..." : "Create Workspace & Continue"}
      </Button>
    </form>
  );
}
