"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Search, BarChart2, Info, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandSearch } from "@/components/search/CommandSearch";

const NAV_LINKS = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/lists", label: "Lists", icon: BookMarked },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/about", label: "About", icon: Info },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 text-primary font-semibold text-lg shrink-0">
          <Film className="h-5 w-5" />
          <span className="hidden sm:inline">Dad&apos;s Recs</span>
        </Link>

        <nav className="flex items-center gap-0.5 ml-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          <CommandSearch />
        </div>
      </div>
    </header>
  );
}
