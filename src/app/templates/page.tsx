export const dynamic = "force-dynamic";
import Link from "next/link";
import { sql } from "@/lib/db";
import { NewTemplateButton } from "./new-button";

export default async function TemplatesPage() {
  const templates = await sql`select id, name, updated_at, thumbnail_url from templates order by updated_at desc`;
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Templates</h1>
        <NewTemplateButton />
      </div>
      {templates.length === 0 ? (
        <p className="mt-6 text-black/60">No templates yet — create your first one.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {templates.map(t => (
            <li key={t.id}>
              <Link href={`/templates/${t.id}`} className="block rounded-lg border border-black/10 bg-white p-4 hover:border-brand">
                <div className="aspect-[3/4] rounded bg-black/5 overflow-hidden">
                  {t.thumbnail_url && <img src={t.thumbnail_url} alt="" className="h-full w-full object-cover object-top" />}
                </div>
                <div className="mt-3 font-medium">{t.name}</div>
                <div className="text-xs text-black/50">{new Date(t.updated_at).toLocaleString("en-NZ")}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
