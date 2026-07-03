"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, type RegisterSchema } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterSchema) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
      },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/onboarding");
      router.refresh();
    }, 1500);
  }

  if (success) {
    return (
      <div className="rounded-lg bg-green-900/20 px-4 py-4 text-sm text-green-400">
        Account created. Redirecting...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="fullName" className="text-sm text-zinc-300">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
          placeholder="Anna Müller"
          {...register("fullName")}
        />
        {errors.fullName && (
          <p className="text-xs text-red-400">{errors.fullName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm text-zinc-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
          placeholder="you@company.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm text-zinc-300">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <p className="rounded-lg bg-red-900/20 px-3 py-2 text-sm text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
        {isSubmitting ? "Creating account..." : "Create free account"}
      </Button>
    </form>
  );
}
