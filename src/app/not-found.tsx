import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Not Found" };

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <span className="text-6xl">🎬</span>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground text-sm max-w-xs">
        This page doesn&apos;t exist. Maybe the film was never made — or Dad hasn&apos;t seen it yet.
      </p>
      <div className="flex gap-3 mt-2">
        <Link
          href="/"
          className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary/50 hover:text-primary transition-colors"
        >
          Go home
        </Link>
        <Link
          href="/search"
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:opacity-90 transition-opacity"
        >
          Search films
        </Link>
      </div>
    </div>
  );
}
