export const dynamic = "force-dynamic";
import Link from "next/link";
import { sql } from "@/lib/db";
import { NewFormButton } from "./new-button";
export default async function FormsPage() {
  const forms = await sql`select f.id, f.name, f.kind, f.status, f.updated_at,
      (select count(*)::int from form_events e where e.form_id = f.id and e.type='view' and e.occurred_at > now() - interval '30 days') views,
      (select count(*)::int from form_events e where e.form_id = f.id and e.type='submit' and e.occurred_at > now() - interval '30 days') submits
    from forms f order by f.updated_at desc`;
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Signup forms</h1><NewFormButton /></div>
      <table className="mt-6 w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-black/10 bg-white text-sm">
        <thead className="bg-black/[.03] text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="px-4 py-2">Form</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Views (30d)</th><th className="px-4 py-2 text-right">Signups (30d)</th><th className="px-4 py-2 text-right">Rate</th></tr></thead>
        <tbody>{forms.map(f => <tr key={f.id} className="border-t border-black/5"><td className="px-4 py-3"><Link href={`/forms/${f.id}`} className="font-medium hover:text-brand">{f.name}</Link></td><td className="px-4 py-3 text-black/60">{f.kind}</td><td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs ${f.status === "live" ? "bg-green-100 text-green-800" : "bg-black/5 text-black/60"}`}>{f.status}</span></td><td className="px-4 py-3 text-right tabular-nums">{f.views.toLocaleString()}</td><td className="px-4 py-3 text-right tabular-nums">{f.submits.toLocaleString()}</td><td className="px-4 py-3 text-right tabular-nums">{f.views ? (100 * f.submits / f.views).toFixed(1) + "%" : "—"}</td></tr>)}</tbody>
      </table>
      {forms.length === 0 && <p className="mt-4 text-sm text-black/50">No forms yet — create one to replace the Klaviyo popup.</p>}
    </div>
  );
}
