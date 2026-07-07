import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060606] px-6 text-center text-white">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/90 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
        <span className="text-lg font-bold text-white">W</span>
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-white/45">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
      >
        Back to home
      </Link>
    </div>
  );
}
