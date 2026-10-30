export const dynamic = "force-dynamic";
import Link from "next/link";
import { sql } from "@/lib/db";

export default async function FlowsPage() {
  const flows = await sql`select id, name, trigger, status, source, klaviyo_status, definition, updated_at from flows order by (klaviyo_status = 'live') desc, name`;
  const Badge = ({ s }: { s: string }) => <span className={`rounded px-2 py-0.5 text-xs ${s === "live" ? "bg-green-100 text-green-800" : "bg-black/5 text-black/60"}`}>{s}</span>;
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Flows</h1>
      <p className="mt-1 text-sm text-black/60">Imported from Klaviyo with every email. Each flow runs here as a draft until you switch it on; Klaviyo keeps running until then.</p>
      <table className="mt-6 w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-black/10 bg-white text-sm">
        <thead className="bg-black/[.03] text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="px-4 py-2">Flow</th><th className="px-4 py-2">Trigger</th><th className="px-4 py-2">Emails</th><th className="px-4 py-2">Klaviyo</th><th className="px-4 py-2">Bluebells EDM</th></tr></thead>
        <tbody>
          {flows.map(f => {
            const steps = (f.definition?.steps ?? []) as { type: string; email?: { status: string }; variants?: unknown[] }[];
            const emails = steps.filter(s => s.email).length + steps.reduce((n, s) => n + (s.variants?.length ?? 0), 0);
            const live = steps.filter(s => s.email?.status === "live").length;
            return (
              <tr key={f.id} className="border-t border-black/5 hover:bg-black/[.02]">
                <td className="px-4 py-3"><Link href={`/flows/${f.id}`} className="font-medium hover:text-brand">{f.name}</Link></td>
                <td className="px-4 py-3 text-black/70">{String(f.trigger).replace("metric:", "")}</td>
                <td className="px-4 py-3 text-black/70">{emails} <span className="text-black/40">({live} live)</span></td>
                <td className="px-4 py-3"><Badge s={f.klaviyo_status ?? "—"} /></td>
                <td className="px-4 py-3"><Badge s={f.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
