"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  resetPasswordSchema,
  type ResetPasswordSchema,
} from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";

type SessionState = "checking" | "valid" | "invalid";

export function ResetPasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>("checking");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // The recovery link established a session via the PKCE callback. Confirm it
  // is present before allowing a password change; otherwise the link is
  // expired or invalid.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      setSessionState(!error && data.user ? "valid" : "invalid");
    });
  }, []);

  async function onSubmit(values: ResetPasswordSchema) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (sessionState === "checking") {
    return <p className="text-sm text-zinc-400">Verificando enlace...</p>;
  }

  if (sessionState === "invalid") {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-lg bg-red-900/20 px-3 py-2 text-sm text-red-400">
          El enlace de recuperación no es válido o ha caducado.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-green-400 hover:text-green-300"
        >
          Solicitar un nuevo enlace
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm text-zinc-300">
          Nueva contraseña
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

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-sm text-zinc-300">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
          placeholder="••••••••"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-red-400">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {serverError && (
        <p className="rounded-lg bg-red-900/20 px-3 py-2 text-sm text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
        {isSubmitting ? "Guardando..." : "Actualizar contraseña"}
      </Button>
    </form>
  );
}
