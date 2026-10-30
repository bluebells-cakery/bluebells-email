export const dynamic = "force-dynamic";
import Link from "next/link";
import { sql } from "@/lib/db";
import { EnginePanel } from "./engine-panel";
import { FlowStatus } from "./flow-controls";
import { byFlow } from "@/lib/metrics";

export default async function FlowsPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams; const days = ([7, 30, 90, 365].includes(Number(d)) ? Number(d) : 30) as 7 | 30 | 90 | 365;
  const flows = await sql`select id, name, trigger, status, source, klaviyo_status, definition, updated_at from flows order by name`;
  const stats = new Map((await byFlow(days)).map(r => [Number(r.id), r]));
  const nz = (n: number) => "$" + Math.round(n).toLocaleString("en-NZ");
  const Badge = ({ s }: { s: string }) => <span className={`rounded px-2 py-0.5 text-xs ${s === "live" ? "bg-green-100 text-green-800" : "bg-black/5 text-black/60"}`}>{s}</span>;
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Flows</h1>

      <EnginePanel />
      <div className="mt-8 flex items-center justify-between"><h2 className="text-lg font-semibold">Performance</h2>
        <div className="flex gap-1 rounded-md border border-black/10 bg-white p-0.5 text-sm">{([7, 30, 90, 365] as const).map(p => <Link key={p} href={`/flows?d=${p}`} className={`rounded px-3 py-1 ${p === days ? "bg-brand text-white" : "text-black/60 hover:bg-black/5"}`}>{p === 365 ? "12 months" : `${p} days`}</Link>)}</div></div>
      <table className="mt-3 w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-black/10 bg-white text-sm">
        <thead className="bg-black/[.03] text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="px-4 py-2">Flow</th><th className="px-4 py-2">Trigger</th><th className="px-4 py-2">Emails</th><th className="px-4 py-2 text-right">Sent</th><th className="px-4 py-2 text-right">Orders</th><th className="px-4 py-2 text-right">Revenue</th><th className="px-4 py-2 text-right">Rev / recipient</th><th className="px-4 py-2">Status</th></tr></thead>
        <tbody>
          {flows.map(f => {
            const steps = (f.definition?.steps ?? []) as { type: string; email?: { status: string }; variants?: unknown[] }[];
            const emails = steps.filter(s => s.email).length + steps.reduce((n, s) => n + (s.variants?.length ?? 0), 0);
            return (
              <tr key={f.id} className="border-t border-black/5 hover:bg-black/[.02]">
                <td className="px-4 py-3"><Link href={`/flows/${f.id}`} className="font-medium hover:text-brand">{f.name}</Link></td>
                <td className="px-4 py-3 text-black/70">{String(f.trigger).replace("metric:", "")}</td>
                <td className="px-4 py-3 text-black/70">{emails}</td>
                <td className="px-4 py-3 text-right tabular-nums">{(stats.get(Number(f.id))?.sent ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums">{stats.get(Number(f.id))?.orders ?? 0}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{nz(stats.get(Number(f.id))?.revenue ?? 0)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-black/60">{(stats.get(Number(f.id))?.sent ?? 0) ? "$" + ((stats.get(Number(f.id))!.revenue) / stats.get(Number(f.id))!.sent).toFixed(2) : "—"}</td>
                                <td className="px-4 py-3"><FlowStatus id={Number(f.id)} status={String(f.status)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
