export const dynamic = "force-dynamic";

import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          Recuperar contraseña
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Introduce tu email y te enviaremos un enlace para restablecerla.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-sm text-zinc-400">
        <Link href="/login" className="text-green-400 hover:text-green-300">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
