export const dynamic = "force-dynamic";

import { LoginForm } from "@/features/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-zinc-400">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-green-400 hover:text-green-300">
            Regístrate gratis
          </Link>
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
