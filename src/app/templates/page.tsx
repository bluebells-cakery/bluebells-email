export const dynamic = "force-dynamic";
import Link from "next/link";
import { sql } from "@/lib/db";
import { NewTemplateButton } from "./new-button";

export default async function TemplatesPage() {
  const templates = await sql`select id, name, kind, source, subject, updated_at, thumbnail_url,
      (select url from media m where t.html like '%' || split_part(m.url, '?', 1) || '%' order by m.width desc nulls last limit 1) as hero
    from templates t order by (kind = 'unlayer') desc, updated_at desc`;
  const mine = templates.filter(t => t.kind === "unlayer"), ref = templates.filter(t => t.kind !== "unlayer");
  const Card = ({ t }: { t: (typeof templates)[number] }) => (
    <li>
      <Link href={`/templates/${t.id}`} className="block rounded-lg border border-black/10 bg-white p-3 hover:border-brand">
        <div className="aspect-[4/3] overflow-hidden rounded bg-black/5">
          {(t.thumbnail_url || t.hero) && <img src={t.thumbnail_url ?? t.hero} alt="" className="h-full w-full object-cover object-top" />}
        </div>
        <div className="mt-2 truncate text-sm font-medium" title={t.name}>{t.name}</div>
        {t.subject && <div className="truncate text-xs text-black/50" title={t.subject}>{t.subject}</div>}
      </Link>
    </li>
  );
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Templates</h1>
        <NewTemplateButton />
      </div>
      {mine.length === 0 ? <p className="mt-6 text-black/60">No templates yet — create your first one.</p>
        : <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">{mine.map(t => <Card key={t.id} t={t} />)}</ul>}
      {ref.length > 0 && (<>
        <h2 className="mt-12 text-lg font-semibold">Past Klaviyo campaigns <span className="text-sm font-normal text-black/50">— reference library</span></h2>
        <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">{ref.map(t => <Card key={t.id} t={t} />)}</ul>
      </>)}
    </div>
  );
}
