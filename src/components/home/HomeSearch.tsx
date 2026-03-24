"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (query.trim()) p.set("q", query.trim());
    router.push(`/search?${p.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, director, or actor…"
          className="pl-10 pr-4 h-12 text-base bg-card border-border focus-visible:ring-primary rounded-xl"
        />
      </div>
    </form>
  );
}
