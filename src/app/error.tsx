"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <span className="text-6xl">📽️</span>
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        An unexpected error occurred. You can try again or go back home.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary/50 hover:text-primary transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:opacity-90 transition-opacity"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
