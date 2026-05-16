import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="text-xl font-bold tracking-tight">
          split<span className="text-primary">kar</span>
        </div>
        <nav className="flex gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Sign up</Button>
          </Link>
        </nav>
      </header>
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl">
          Split expenses with friends.<br />
          <span className="text-primary">Never argue about money again.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl">
          Track group expenses, split bills any way you want, and settle up in a tap.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup">
            <Button size="lg">Get started — it&apos;s free</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">I have an account</Button>
          </Link>
        </div>
      </section>
      <footer className="px-6 py-6 text-center text-sm text-muted-foreground border-t border-border">
        Built with Next.js + Supabase. 100% free &amp; open source.
      </footer>
    </main>
  );
}
