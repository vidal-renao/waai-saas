export const dynamic = "force-dynamic";

import { RegisterForm } from "@/features/auth/RegisterForm";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Create Account</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-green-400 hover:text-green-300">
            Sign in
          </Link>
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
