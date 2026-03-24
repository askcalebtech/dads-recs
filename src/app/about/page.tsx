import type { Metadata } from "next";
import Link from "next/link";
import { Film, Search, BarChart2, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "What is Dad's Recs and how does it work?",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">About Dad&apos;s Recs</h1>
      <p className="text-muted-foreground mb-10">
        A living record of every movie Dad has watched, rated, and sometimes reviewed.
      </p>

      <div className="flex flex-col gap-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold mb-2">What is this?</h2>
          <p className="text-muted-foreground">
            Dad keeps a diary of every film he watches on{" "}
            <a
              href="https://letterboxd.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
            >
              Letterboxd
            </a>
            . This site turns that diary into a searchable database — so you can look up any movie,
            see whether he&apos;s watched it, and find out what he thought.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">What you can do</h2>
          <div className="flex flex-col gap-3">
            {[
              {
                icon: Search,
                heading: "Search",
                body: "Type any title, director, or actor to find films instantly. Use the filters to narrow down by genre, year, decade, or rating.",
                href: "/search",
                cta: "Go to search",
              },
              {
                icon: Star,
                heading: "See Dad's ratings & reviews",
                body: "Each film page shows his star rating (out of 5) and his written review if he left one — straight from Letterboxd.",
                href: "/search?sortBy=rating_desc",
                cta: "Highest rated films",
              },
              {
                icon: BarChart2,
                heading: "Explore the data",
                body: "Curious about patterns? The analytics page breaks down his viewing history by genre, year, decade, director, and more.",
                href: "/analytics",
                cta: "Go to analytics",
              },
            ].map(({ icon: Icon, heading, body, href, cta }) => (
              <div key={heading} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium mb-1">{heading}</p>
                  <p className="text-muted-foreground">{body}</p>
                  <Link
                    href={href}
                    className="inline-block mt-2 text-xs text-primary hover:underline"
                  >
                    {cta} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">How it&apos;s built</h2>
          <p className="text-muted-foreground">
            Dad&apos;s Letterboxd export is ingested into a SQLite database, then enriched with
            poster images, overviews, cast, and crew from{" "}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
            >
              TMDB
            </a>
            . The site is a{" "}
            <span className="text-foreground">Next.js</span> app (App Router, TypeScript,
            Tailwind CSS) deployed on Vercel.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">Ratings</h2>
          <p className="text-muted-foreground">
            Letterboxd uses a half-star scale from ½ to 5 stars. A film without a rating just means
            he logged it but hasn&apos;t rated it yet — he&apos;s slowly working through his backlog.
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            {[
              { stars: "★★★★★", label: "5.0", desc: "All-time favourite" },
              { stars: "★★★★½", label: "4.5", desc: "Excellent" },
              { stars: "★★★★", label: "4.0", desc: "Really good" },
              { stars: "★★★½", label: "3.5", desc: "Good" },
              { stars: "★★★", label: "3.0", desc: "Fine" },
              { stars: "★★½", label: "2.5", desc: "Mixed" },
              { stars: "★★", label: "2.0 or below", desc: "Didn't enjoy it" },
            ].map(({ stars, label, desc }) => (
              <div key={label} className="flex items-center gap-3 text-xs">
                <span className="text-primary w-[72px] shrink-0">{stars}</span>
                <span className="text-muted-foreground w-16 shrink-0">{label}</span>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
