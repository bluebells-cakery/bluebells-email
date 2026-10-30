import { neon } from "@neondatabase/serverless";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const sql = neon(process.env.DATABASE_URL);
await sql`create table if not exists migrations (name text primary key, applied_at timestamptz not null default now())`;
const done = new Set((await sql`select name from migrations`).map(r => r.name));
for (const f of readdirSync("db").filter(f => f.endsWith(".sql")).sort()) {
  if (done.has(f)) continue;
  const body = readFileSync(join("db", f), "utf8")
    .replace(/--[^\n]*/g, "")
    .split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
  for (const stmt of body) await sql.query(stmt);
  await sql`insert into migrations(name) values (${f})`;
  console.log("applied", f);
}
console.log("migrations up to date");
