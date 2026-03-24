/**
 * Pre-build DB sanity check.
 * Runs before `next build` on Vercel to confirm:
 *   1. The DB file exists at the expected path
 *   2. better-sqlite3 can open it (native binary works)
 *   3. Core tables are present and have data
 *
 * Exits with code 1 on any failure, which aborts the build.
 */

import { existsSync, statSync } from "fs";
import { join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const DB_PATH = join(process.cwd(), "dads-recs.db");

function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.error(`  ✗ ${msg}`); process.exit(1); }

console.log("\n── DB pre-build check ──────────────────────────────");
console.log(`  cwd      : ${process.cwd()}`);
console.log(`  db path  : ${DB_PATH}`);

// 1. File exists
if (!existsSync(DB_PATH)) {
  fail(`dads-recs.db not found at ${DB_PATH}`);
}
const size = (statSync(DB_PATH).size / 1024 / 1024).toFixed(2);
pass(`file exists (${size} MB)`);

// 2. better-sqlite3 can open it
let db;
try {
  const Database = require("better-sqlite3");
  db = new Database(DB_PATH, { readonly: true });
  pass("better-sqlite3 opened the database");
} catch (err) {
  fail(`better-sqlite3 failed to open: ${err.message}`);
}

// 3. Core tables exist and have data
const checks = [
  { table: "films",         min: 1 },
  { table: "watch_history", min: 1 },
  { table: "genres",        min: 1 },
  { table: "directors",     min: 1 },
];

for (const { table, min } of checks) {
  try {
    const { count } = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
    if (count < min) {
      fail(`${table} has ${count} rows (expected >= ${min})`);
    }
    pass(`${table}: ${count} rows`);
  } catch (err) {
    fail(`query on ${table} failed: ${err.message}`);
  }
}

db.close();
console.log("────────────────────────────────────────────────────\n");
