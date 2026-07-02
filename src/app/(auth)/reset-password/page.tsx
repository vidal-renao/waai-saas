export const dynamic = "force-dynamic";

import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Nueva contraseña</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Elige una nueva contraseña para tu cuenta.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
