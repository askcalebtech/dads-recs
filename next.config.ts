import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Explicitly include the SQLite DB in every serverless function bundle.
  // Without this, Vercel's file tracer can't detect it (dynamic path string)
  // and the file is absent at runtime even though it's committed to the repo.
  outputFileTracingIncludes: {
    "/**": ["./dads-recs.db"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
};

export default nextConfig;
