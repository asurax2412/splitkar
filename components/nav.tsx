"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, UsersRound, Activity, LogOut, Plus } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/friends", label: "Friends", icon: UsersRound },
  { href: "/activity", label: "Activity", icon: Activity },
];

export function Nav({ userName }: { userName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r border-border flex-col">
      <Link href="/dashboard" className="px-6 py-5 text-xl font-bold tracking-tight border-b border-border">
        split<span className="text-primary">kar</span>
      </Link>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active ? "bg-muted font-medium" : "hover:bg-muted text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
        <Link
          href="/groups/new"
          className="flex items-center gap-3 px-3 py-2 mt-4 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" /> New group
        </Link>
      </nav>
      <div className="border-t border-border p-3">
        <div className="px-3 py-2 text-xs text-muted-foreground truncate">{userName}</div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

export function MobileTopBar({ userName }: { userName: string }) {
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
      <Link href="/dashboard" className="text-lg font-bold">
        split<span className="text-primary">kar</span>
      </Link>
      <span className="text-xs text-muted-foreground">{userName}</span>
    </header>
  );
}

export function MobileBottomBar() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border flex justify-around z-30">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center py-2 px-3 text-xs",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5 mb-0.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
