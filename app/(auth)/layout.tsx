import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="text-2xl font-bold tracking-tight mb-8">
        split<span className="text-primary">kar</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
