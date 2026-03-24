import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "dads-recs.db");

const sqlite = new Database(DB_PATH, { readonly: true });
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite };
