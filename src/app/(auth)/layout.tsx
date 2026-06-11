export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500">
            <span className="text-lg font-bold text-white">W</span>
          </div>
          <span className="text-sm font-medium text-zinc-400">WAAI SaaS</span>
        </div>
        {children}
      </div>
    </div>
  );
}
