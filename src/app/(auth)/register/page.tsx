export const dynamic = "force-dynamic";

import { RegisterForm } from "@/features/auth/RegisterForm";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Crear cuenta</h1>
        <p className="mt-1 text-sm text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-green-400 hover:text-green-300">
            Inicia sesión
          </Link>
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
