import { sql } from "@/lib/db";

export async function getSetting(key: string): Promise<string | null> {
  const r = await sql`select value from settings where key = ${key}`;
  return r[0]?.value ?? null;
}
export async function setSetting(key: string, value: string) {
  await sql`insert into settings(key, value) values (${key}, ${value})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}
