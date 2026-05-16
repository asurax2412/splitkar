import Link from "next/link";
import { Button } from "@/components/ui/button";
import pkg from "@/package.json";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-1.96c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.11-.75.41-1.26.74-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.55C20.21 21.38 23.5 17.07 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

const REPO_URL = "https://github.com/asurax2412/splitkar";

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
      <footer className="px-6 py-6 border-t border-border text-sm text-muted-foreground">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-medium text-foreground">Splitkar</span>
            <span className="mx-2">·</span>
            <span>v{pkg.version}</span>
            <span className="mx-2">·</span>
            <span>© {new Date().getFullYear()} Yash Kumar</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Next.js · Supabase · PostgreSQL</span>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition"
            >
              <GithubIcon className="h-4 w-4" />
              Source
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
